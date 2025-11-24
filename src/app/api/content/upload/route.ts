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

    // Get user's site
    const site = await db.site.findFirst({
      where: { userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site not found. Please set up your site first." },
        { status: 404 },
      );
    }

    // Get API key
    if (!site.apiKeyEncrypted) {
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

    const apiKey = decryptApiKey(site.apiKeyEncrypted, encryptionKey);

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
        siteId: site.id,
        filename: file.name,
        storagePath: "", // Will be set after upload
        status: "processing",
      },
    });

    try {
      // Upload to Supabase Storage
      const filePath = `${site.id}/${document.id}/${file.name}`;
      
      // Check if bucket exists, create if not (this might fail if no permissions)
      try {
        const { data: uploadData, error: uploadError } =
          await supabaseAdmin.storage
            .from("documents")
            .upload(filePath, buffer, {
              contentType: "application/pdf",
              upsert: false,
            });

        if (uploadError) {
          // If bucket doesn't exist, try to create it (might fail without proper permissions)
          if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("not found")) {
            console.warn("Documents bucket not found. Please create it in Supabase Dashboard → Storage");
            // Continue without storage - we'll still process the document
          } else {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
          }
        } else if (uploadData) {
          // Update document with storage path only if upload succeeded
          await db.document.update({
            where: { id: document.id },
            data: { storagePath: filePath },
          });
        }
      } catch (storageError) {
        console.warn("Storage upload failed, continuing without storage:", storageError);
        // Continue processing even if storage fails
      }

      // Process PDF: extract text and chunk
      console.log("Processing PDF...");
      let chunks: Array<{ text: string; metadata: any }>;
      try {
        chunks = await processPDF(buffer, file.name);
        console.log(`PDF processed into ${chunks.length} chunks`);
        if (!chunks || chunks.length === 0) {
          throw new Error("No text could be extracted from the PDF");
        }
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        throw new Error(`PDF processing failed: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}`);
      }

      // Generate embeddings
      console.log("Generating embeddings...");
      const chunkTexts = chunks.map((chunk) => chunk.text);
      let embeddings: number[][];
      try {
        embeddings = await generateEmbeddings(chunkTexts, apiKey);
        console.log(`Generated ${embeddings.length} embeddings`);
        if (!embeddings || embeddings.length === 0) {
          throw new Error("Failed to generate embeddings");
        }
      } catch (embedError) {
        console.error("Embedding generation error:", embedError);
        throw new Error(`Embedding generation failed: ${embedError instanceof Error ? embedError.message : "Unknown error"}`);
      }

      // Store vectors in database
      // Note: We need to use raw SQL for pgvector
      console.log("Storing vectors in database...");
      let vectorsInserted = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (!embeddings[i] || embeddings[i].length === 0) {
          console.warn(`Skipping chunk ${i} - no embedding generated`);
          continue;
        }
        
        const embeddingString = `[${embeddings[i]!.join(",")}]`;
        const chunkId = randomUUID();
        const chunkText = chunks[i]?.text ?? "";
        const metadataJson = JSON.stringify(chunks[i]?.metadata ?? {});
        
        try {
          // Use $executeRaw with parameterized query to prevent SQL injection
          // We need raw SQL because Prisma doesn't natively support vector types
          // But we use parameterized queries for security
          console.log(`[Vector ${i + 1}/${chunks.length}] Attempting insert...`);
          
          await db.$executeRaw`
            INSERT INTO vectors (id, site_id, doc_id, chunk_text, embedding, metadata, created_at)
            VALUES (
              ${chunkId}::uuid,
              ${site.id}::uuid,
              ${document.id}::uuid,
              ${chunkText},
              ${embeddingString}::vector,
              ${metadataJson}::jsonb,
              NOW()
            )
          `;
          
          console.log(`[Vector ${i + 1}] Success`);
          vectorsInserted++;
        } catch (sqlError) {
          console.error(`[Vector ${i + 1}] SQL Error:`, sqlError);
          console.error("Error type:", typeof sqlError);
          console.error("Error name:", sqlError?.constructor?.name);
          if (sqlError instanceof Error) {
            console.error("Error message:", sqlError.message);
            console.error("Error stack:", sqlError.stack);
          } else {
            console.error("Error string:", String(sqlError));
          }
          console.error("Context:", {
            chunkId,
            siteId: site.id,
            docId: document.id,
            chunkTextLength: chunkText.length,
            embeddingLength: embeddingString.length,
            hasExecuteRawUnsafe: typeof db.$executeRawUnsafe,
          });
          // Continue with other chunks even if one fails
        }
      }
      
      if (vectorsInserted === 0 && chunks.length > 0) {
        throw new Error("Failed to store any vectors in the database. Check if the vectors table and embedding column exist.");
      }

      // Update document status
      await db.document.update({
        where: { id: document.id },
        data: { status: "completed" },
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
            status: "error",
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

