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

    // Get site
    const site = await db.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (!site.apiKeyEncrypted) {
      return NextResponse.json(
        { error: "API key not configured for this site" },
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

    const apiKey = decryptApiKey(site.apiKeyEncrypted, encryptionKey);

    // Retrieve relevant context using RAG
    const relevantChunks = await retrieveContext(message, siteId, apiKey, 5);
    const context = buildContext(relevantChunks);

    // Build prompt with context
    const systemPrompt = `You are a helpful AI assistant for a business. Answer questions based on the provided context. If the answer is not in the context, say so politely.

Context:
${context}

Answer the user's question based on the context above. Be concise and helpful.`;

    // Generate response using OpenAI
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";

    // Log conversation
    const visitorIdFinal = visitorId ?? crypto.randomUUID();
    const conversation = await db.conversation.findFirst({
      where: {
        siteId,
        visitorId: visitorIdFinal,
      },
      orderBy: { updatedAt: "desc" },
    });

    const messages = conversation
      ? [
          ...((conversation.messages as any[]) ?? []),
          { role: "user", content: message, timestamp: new Date() },
          { role: "assistant", content: response, timestamp: new Date() },
        ]
      : [
          { role: "user", content: message, timestamp: new Date() },
          { role: "assistant", content: response, timestamp: new Date() },
        ];

    if (conversation) {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { messages, updatedAt: new Date() },
      });
    } else {
      await db.conversation.create({
        data: {
          siteId,
          visitorId: visitorIdFinal,
          messages,
        },
      });
    }

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

