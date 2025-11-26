import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { retrieveContext, buildContext } from "~/server/services/ragService";
import { decryptApiKey } from "~/server/services/encryption";
import OpenAI from "openai";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } },
) {
  try {
    const { siteId } = params;
    const body = await request.json();
    const { message, visitorId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Get bot (siteId is actually botId in the route, but keeping for backward compatibility)
    // Try to find by botId first, then by siteId
    let bot = await db.bot.findUnique({
      where: { id: siteId },
      include: { site: true },
    });

    // If not found as botId, try finding by siteId
    if (!bot) {
      const site = await db.site.findUnique({
        where: { id: siteId },
        include: { bot: true },
      });
      if (site?.bot) {
        bot = site.bot;
      }
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    if (!bot.openaiApiKeyEncrypted) {
      return NextResponse.json(
        { error: "API key not configured for this bot" },
        { status: 400 },
      );
    }

    // Decrypt API key
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json(
        { error: "Encryption key not configured" },
        { status: 500 },
      );
    }

    const apiKey = decryptApiKey(bot.openaiApiKeyEncrypted, encryptionKey);

    // Retrieve relevant context using RAG
    const relevantChunks = await retrieveContext(message, bot.id, apiKey, 5);
    const context = buildContext(relevantChunks);

    // Build prompt with context
    const systemPrompt = `You are a helpful AI assistant for a business. Answer questions based on the provided context. If the answer is not in the context, say so politely.

Context:
${context}

Answer the user's question based on the context above. Be concise and helpful.`;

    // Generate response using OpenAI
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

    // Log conversation and messages
    const visitorIdFinal = visitorId ?? crypto.randomUUID();
    let conversation = await db.conversation.findFirst({
      where: {
        botId: bot.id,
        visitorId: visitorIdFinal,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (conversation) {
      // Update existing conversation
      await db.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    } else {
      // Create new conversation
      conversation = await db.conversation.create({
        data: {
          botId: bot.id,
          visitorId: visitorIdFinal,
        },
      });
    }

    // Create message records
    await db.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: "user",
          content: message,
        },
        {
          conversationId: conversation.id,
          role: "assistant",
          content: response,
        },
      ],
    });

    return NextResponse.json({
      response,
      visitorId: visitorIdFinal,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}