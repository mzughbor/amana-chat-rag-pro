import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseAdmin } from "~/lib/supabase";
import { processPDF } from "~/server/services/documentProcessor";
import { generateEmbeddings } from "~/server/services/embeddingService";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    console.log("Upload request received");
    const session = await getServerAuthSessionFromRequest(request);
    console.log("Session:", session ? "authenticated" : "not authenticated");

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's site with bot
    const site = await db.site.findFirst({
      where: { userId: session.user.id },
      include: { bot: true },
    });

    if (!site || !site.bot) {
      return NextResponse.json(
        { error: "Bot not found. Please create a bot first." },
        { status: 404 },
      );
    }

    const bot = site.bot;

    // Get API key
    if (!bot.openaiApiKeyEncrypted) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 400 },
      );
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json(
        { error: "Encryption key not configured" },
        { status: 500 },
      );
    }

    const apiKey = decryptApiKey(bot.openaiApiKeyEncrypted, encryptionKey);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create document record
    const document = await db.document.create({
      data: {
        botId: bot.id,
        sourceType: "pdf",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath: "", // Will be set after upload
        ingestionStatus: "processing",
        metadata: {},
      },
    });

    try {
      // Upload to Supabase Storage (optional - document processing will continue if this fails)
      const filePath = `${bot.id}/${document.id}/${file.name}`;
      let storageSuccess = false;
      
      try {
        console.log("Uploading file to Supabase storage...");
        const { data: uploadData, error: uploadError } =
          await supabaseAdmin.storage
            .from("documents")
            .upload(filePath, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

        if (uploadError) {
          if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("not found")) {
            console.warn("Documents bucket not found. Please create 'documents' bucket in Supabase Dashboard → Storage");
          } else if (uploadError.message.includes("The resource already exists")) {
            console.warn("File already exists in storage, continuing with processing");
            storageSuccess = true;
          } else {
            console.warn(`Storage upload failed: ${uploadError.message}`);
          }
        } else if (uploadData) {
          console.log("File uploaded to storage successfully");
          storageSuccess = true;
        }

        if (storageSuccess) {
          // Update document with storage path only if upload succeeded
          await db.document.update({
            where: { id: document.id },
            data: { storagePath: filePath },
          });
        }
      } catch (storageError) {
        console.warn("Storage upload failed, continuing without storage:", storageError);
        // Continue processing even if storage fails - this is not critical
      }

      // Process PDF: extract text and chunk
      console.log(`Processing PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      let chunks: Array<{ text: string; metadata: any }>;
      
      try {
        console.log('Initializing PDF processing...');
        chunks = await processPDF(buffer, file.name);
        console.log(`PDF processed into ${chunks.length} chunks`);
        
        if (!chunks || chunks.length === 0) {
          throw new Error("No text could be extracted from the PDF. The file might be empty, corrupted, or contain only images.");
        }

        // Validate chunk content
        const validChunks = chunks.filter(chunk => chunk.text && chunk.text.trim().length > 0);
        if (validChunks.length === 0) {
          throw new Error("All extracted chunks are empty. The PDF might contain only images or unreadable text.");
        }

        if (validChunks.length < chunks.length) {
          console.warn(`Filtered out ${chunks.length - validChunks.length} empty chunks`);
          chunks = validChunks;
        }

        // Check total text length
        const totalTextLength = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);
        console.log(`Total extracted text: ${totalTextLength} characters`);
        
        if (totalTextLength < 100) {
          console.warn("Very little text extracted from PDF. This might affect the quality of the RAG system.");
        }
        
        // Additional validation: Check for extremely large chunks that might cause issues
        const oversizedChunks = chunks.filter(chunk => chunk.text.length > 5000);
        if (oversizedChunks.length > 0) {
          console.warn(`Found ${oversizedChunks.length} chunks with more than 5000 characters. This might affect performance.`);
        }

      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        const errorMessage = pdfError instanceof Error ? pdfError.message : "Unable to process PDF file";
        // Log additional context for debugging
        console.error("PDF processing context:", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          bufferLength: buffer.length,
        });
        throw new Error(`PDF processing failed: ${errorMessage}`);
      }

      // Generate embeddings
      console.log("Generating embeddings for chunks...");
      const chunkTexts = chunks.map((chunk) => chunk.text.trim());
      let embeddings: number[][];
      
      try {
        // Validate API key format
        if (!apiKey || apiKey.length < 10) {
          throw new Error("Invalid OpenAI API key format");
        }

        // Validate chunk texts before sending to OpenAI
        if (chunkTexts.some(text => !text || text.length === 0)) {
          throw new Error("Some chunks contain empty text. This should have been filtered out earlier.");
        }
        
        // Check for extremely long texts that might exceed token limits
        const longTexts = chunkTexts.filter(text => text.length > 10000);
        if (longTexts.length > 0) {
          console.warn(`Found ${longTexts.length} chunks with more than 10000 characters. This might exceed token limits.`);
        }

        embeddings = await generateEmbeddings(chunkTexts, apiKey);
        console.log(`Generated ${embeddings.length} embeddings`);
        
        if (!embeddings || embeddings.length === 0) {
          throw new Error("No embeddings were generated");
        }

        if (embeddings.length !== chunks.length) {
          throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`);
        }

        // Validate embedding dimensions
        const expectedDimensions = 1536; // text-embedding-3-small
        for (let i = 0; i < embeddings.length; i++) {
          if (!embeddings[i] || embeddings[i].length !== expectedDimensions) {
            throw new Error(`Invalid embedding dimensions at index ${i}: expected ${expectedDimensions}, got ${embeddings[i]?.length || 0}`);
          }
        }

      } catch (embedError) {
        console.error("Embedding generation error:", embedError);
        if (embedError instanceof Error && embedError.message.includes("API key")) {
          throw new Error("OpenAI API key is invalid or has insufficient credits. Please check your API key.");
        } else if (embedError instanceof Error && embedError.message.includes("400")) {
          throw new Error("Bad request to OpenAI API. This might be due to invalid input or exceeding token limits.");
        } else if (embedError instanceof Error && embedError.message.includes("429")) {
          throw new Error("Rate limit exceeded for OpenAI API. Please try again later or check your plan limits.");
        } else if (embedError instanceof Error && embedError.message.includes("500")) {
          throw new Error("OpenAI API server error. Please try again later.");
        }
        throw new Error(`Embedding generation failed: ${embedError instanceof Error ? embedError.message : "Unknown embedding error"}`);
      }

      // Store vectors in database using safe parameterized queries
      console.log("Storing vectors in database...");
      let vectorsInserted = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        if (!embeddings[i] || embeddings[i].length === 0) {
          console.warn(`Skipping chunk ${i} - no embedding generated`);
          continue;
        }
        
        const embedding = embeddings[i]!;
        const chunkId = randomUUID();
        const chunkText = chunks[i]?.text ?? "";
        const metadata = chunks[i]?.metadata ?? {};
        
        try {
          console.log(`[Vector ${i + 1}/${chunks.length}] Inserting chunk...`);
          
          // Use parameterized query for pgvector compatibility and security
          const embeddingVector = `[${embedding.join(",")}]`;
          const metadataJson = JSON.stringify(metadata);
          
          // Validate that the embedding has the correct dimensions before inserting
          if (embedding.length !== 1536) {
            throw new Error(`Invalid embedding dimensions: expected 1536, got ${embedding.length}`);
          }
          
          await db.$executeRaw`
            INSERT INTO vectors (id, "botId", "documentId", "chunkId", "chunkText", embedding, metadata, "createdAt")
            VALUES (
              ${chunkId},
              ${bot.id},
              ${document.id},
              ${i},
              ${chunkText},
              ${embeddingVector}::vector,
              ${metadataJson}::jsonb,
              NOW()
            )
          `;
          
          console.log(`[Vector ${i + 1}] Success`);
          vectorsInserted++;
        } catch (sqlError) {
          console.error(`[Vector ${i + 1}] Database error:`, sqlError);
          
          // Check for specific error types
          if (sqlError instanceof Error) {
            if (sqlError.message.includes('column "embedding" does not exist')) {
              throw new Error("Database setup incomplete: The 'embedding' column is missing from the vectors table. Please run the setup SQL from SETUP.md");
            } else if (sqlError.message.includes('relation "vectors" does not exist')) {
              throw new Error("Database setup incomplete: The 'vectors' table does not exist. Please run 'npm run db:push' first");
            } else if (sqlError.message.includes('type "vector" does not exist')) {
              throw new Error("Database setup incomplete: pgvector extension is not enabled. Please run 'CREATE EXTENSION vector;' in your database");
            } else if (sqlError.message.includes('invalid input syntax for type vector')) {
              throw new Error("Invalid vector data format. This may indicate an issue with the embedding generation or data formatting.");
            } else if (sqlError.message.includes('column "site_id" does not exist') || sqlError.message.includes('column "doc_id" does not exist') || sqlError.message.includes('column "chunk_text" does not exist') || sqlError.message.includes('column "created_at" does not exist')) {
              throw new Error("Database schema mismatch: Column names don't match expected schema. Please check your database schema and ensure it matches the Prisma schema.");
            }
          }
          
          // For other errors, log details and continue
          console.error("Chunk processing context:", {
            chunkIndex: i,
            chunkId,
            siteId: site.id,
            docId: document.id,
            chunkTextLength: chunkText.length,
            embeddingDimensions: embedding.length,
          });
          
          // If it's the first few chunks and they're all failing, abort
          if (i < 3 && vectorsInserted === 0) {
            throw new Error(`Database insertion failed: ${sqlError instanceof Error ? sqlError.message : 'Unknown database error'}`);
          }
          
          // Otherwise, continue with remaining chunks
          console.warn(`Continuing with remaining chunks...`);
        }
      }
      
      if (vectorsInserted === 0 && chunks.length > 0) {
        throw new Error("Failed to store any vectors in the database. Check if the vectors table and embedding column exist.");
      }

      // Update document status
      await db.document.update({
        where: { id: document.id },
        data: { ingestionStatus: "completed" },
      });

      return NextResponse.json({
        success: true,
        documentId: document.id,
        chunksProcessed: chunks.length,
      });
    } catch (error) {
      console.error("Processing error:", error);
      // Update document status to error (if document exists)
      try {
        await db.document.update({
          where: { id: document.id },
          data: {
            ingestionStatus: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch (updateError) {
        console.error("Failed to update document status:", updateError);
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Returning error response:", errorMessage);
      
      return NextResponse.json(
        {
          error: "Processing failed",
          message: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Upload error (outer catch):", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}

