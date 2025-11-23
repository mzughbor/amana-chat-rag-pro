import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { generateEmbeddings } from "~/server/services/embeddingService";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import crypto from "crypto";

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

    const body = await request.json();
    const { question, answer } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 },
      );
    }

    // Create Q&A pair
    const qaPair = await db.qAPair.create({
      data: {
        siteId: site.id,
        question,
        answer,
      },
    });

    // Generate embedding for the question (for retrieval)
    const questionEmbedding = await generateEmbeddings([question], apiKey);
    const embeddingString = `[${questionEmbedding[0]?.join(",")}]`;

    // Store as vector for retrieval using parameterized query
    await db.$executeRaw`
      INSERT INTO vectors (id, "siteId", "docId", "chunkText", embedding, metadata, "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${site.id},
        NULL,
        ${`Q: ${question}\nA: ${answer}`},
        ${embeddingString}::vector,
        ${JSON.stringify({ type: "qa", qaId: qaPair.id })}::jsonb,
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      qaPairId: qaPair.id,
    });
  } catch (error) {
    console.error("Q&A creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

