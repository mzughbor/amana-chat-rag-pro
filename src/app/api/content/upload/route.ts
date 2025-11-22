import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseAdmin } from "~/lib/supabase";
import { processPDF } from "~/server/services/documentProcessor";
import { generateEmbeddings } from "~/server/services/embeddingService";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSessionFromRequest(request);

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
      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from("documents")
          .upload(filePath, buffer, {
            contentType: "application/pdf",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Update document with storage path
      await db.document.update({
        where: { id: document.id },
        data: { storagePath: filePath },
      });

      // Process PDF: extract text and chunk
      const chunks = await processPDF(buffer, file.name);

      // Generate embeddings
      const chunkTexts = chunks.map((chunk) => chunk.text);
      const embeddings = await generateEmbeddings(chunkTexts, apiKey);

      // Store vectors in database
      // Note: We need to use raw SQL for pgvector
      for (let i = 0; i < chunks.length; i++) {
        const embeddingString = `[${embeddings[i]?.join(",")}]`;
        await db.$executeRaw`
          INSERT INTO vectors (id, site_id, doc_id, chunk_text, embedding, metadata, created_at)
          VALUES (
            ${crypto.randomUUID()},
            ${site.id},
            ${document.id},
            ${chunks[i]?.text ?? ""},
            ${embeddingString}::vector,
            ${JSON.stringify(chunks[i]?.metadata ?? {})}::jsonb,
            NOW()
          )
        `;
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
      // Update document status to error
      await db.document.update({
        where: { id: document.id },
        data: {
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      return NextResponse.json(
        {
          error: "Processing failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

