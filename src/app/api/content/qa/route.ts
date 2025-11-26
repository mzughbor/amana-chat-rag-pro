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
        botId: bot.id,
        question,
        answer,
        status: "active",
      },
    });

    // Generate embedding for the question (for retrieval)
    const questionEmbedding = await generateEmbeddings([question], apiKey);
    const embeddingString = `[${questionEmbedding[0]?.join(",")}]`;

    // Store as vector for retrieval using parameterized query
    await db.$executeRaw`
      INSERT INTO vectors (id, "botId", "documentId", "chunkId", "chunkText", embedding, metadata, "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${bot.id},
        NULL,
        0,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerAuthSessionFromRequest(request);

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

    const body = await request.json();
    const { id, question, answer } = body;

    if (!id || !question || !answer) {
      return NextResponse.json(
        { error: "ID, question and answer are required" },
        { status: 400 },
      );
    }

    // Check if Q&A pair belongs to user's bot
    const existingQaPair = await db.qAPair.findFirst({
      where: {
        id,
        botId: bot.id,
      },
    });

    if (!existingQaPair) {
      return NextResponse.json(
        { error: "Q&A pair not found or unauthorized" },
        { status: 404 },
      );
    }

    // Update Q&A pair
    const updatedQaPair = await db.qAPair.update({
      where: { id },
      data: {
        question,
        answer,
        updatedAt: new Date(),
      },
    });

    // Delete old vector embeddings for this Q&A pair
    await db.$executeRaw`
      DELETE FROM vectors 
      WHERE "botId" = ${bot.id} 
      AND metadata->>'type' = 'qa' 
      AND metadata->>'qaId' = ${id}
    `;

    // Generate new embedding for the updated question
    const questionEmbedding = await generateEmbeddings([question], apiKey);
    const embeddingString = `[${questionEmbedding[0]?.join(",")}]`;

    // Store updated vector for retrieval
    await db.$executeRaw`
      INSERT INTO vectors (id, "botId", "documentId", "chunkId", "chunkText", embedding, metadata, "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${bot.id},
        NULL,
        0,
        ${`Q: ${question}\nA: ${answer}`},
        ${embeddingString}::vector,
        ${JSON.stringify({ type: "qa", qaId: id })}::jsonb,
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      qaPair: updatedQaPair,
    });
  } catch (error) {
    console.error("Q&A update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 },
      );
    }

    // Check if Q&A pair belongs to user's bot
    const existingQaPair = await db.qAPair.findFirst({
      where: {
        id,
        botId: bot.id,
      },
    });

    if (!existingQaPair) {
      return NextResponse.json(
        { error: "Q&A pair not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete Q&A pair
    await db.qAPair.delete({
      where: { id },
    });

    // Delete associated vector embeddings
    await db.$executeRaw`
      DELETE FROM vectors 
      WHERE "botId" = ${bot.id} 
      AND metadata->>'type' = 'qa' 
      AND metadata->>'qaId' = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: "Q&A pair deleted successfully",
    });
  } catch (error) {
    console.error("Q&A deletion error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}