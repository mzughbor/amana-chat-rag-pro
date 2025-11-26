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

    // Get bot (using raw query to match actual schema)
    let bot: any = null;
    try {
      // First try to find bot by ID directly
      const bots: any[] = await db.$queryRaw`
        SELECT b.id, b."siteId", b."openaiApiKeyEncrypted", s."apiKeyEncrypted" as "siteApiKeyEncrypted"
        FROM bots b
        LEFT JOIN sites s ON b."siteId" = s.id
        WHERE b.id = ${siteId}
        LIMIT 1
      `;
      
      if (bots.length > 0) {
        bot = bots[0];
      } else {
        // If not found, try to find bot by siteId
        const siteBots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b."openaiApiKeyEncrypted", s."apiKeyEncrypted" as "siteApiKeyEncrypted"
          FROM bots b
          LEFT JOIN sites s ON b."siteId" = s.id
          WHERE b."siteId" = ${siteId}
          LIMIT 1
        `;
        
        if (siteBots.length > 0) {
          bot = siteBots[0];
        }
      }
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 },
      );
    }

    // If bot not found, try to get site as fallback (for backward compatibility)
    let site: any = null;
    if (!bot) {
      try {
        const sites: any[] = await db.$queryRaw`
          SELECT id, "apiKeyEncrypted"
          FROM sites
          WHERE id = ${siteId}
          LIMIT 1
        `;
        
        if (sites.length > 0) {
          site = sites[0];
        }
      } catch (dbError) {
        console.error("Database query failed:", dbError);
        return NextResponse.json(
          { error: "Database connection failed" },
          { status: 500 },
        );
      }
    }

    if (!bot && !site) {
      return NextResponse.json({ error: "Bot or site not found" }, { status: 404 });
    }

    // Get API key from bot or site
    let apiKeyEncrypted = null;
    if (bot) {
      apiKeyEncrypted = bot.openaiApiKeyEncrypted;
    } else if (site) {
      apiKeyEncrypted = site.apiKeyEncrypted;
    }

    if (!apiKeyEncrypted) {
      return NextResponse.json(
        { error: "API key not configured for this bot/site" },
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

    const apiKey = decryptApiKey(apiKeyEncrypted, encryptionKey);

    // Retrieve relevant context using RAG
    // Use the bot ID for context retrieval if available, otherwise use site ID
    const contextId = bot ? bot.id : siteId;
    const relevantChunks = await retrieveContext(message, contextId, apiKey, 5);
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

    // Log conversation (using raw queries to match actual schema)
    let conversation: any = null;
    const visitorIdFinal = visitorId ?? crypto.randomUUID();
    
    try {
      // Try to find existing conversation
      const conversations: any[] = await db.$queryRaw`
        SELECT id, messages, "botId", "siteId"
        FROM conversations
        WHERE COALESCE("botId", "siteId") = ${contextId} AND "visitorId" = ${visitorIdFinal}
        ORDER BY "updatedAt" DESC
        LIMIT 1
      `;
      
      if (conversations.length > 0) {
        conversation = conversations[0];
      }
    } catch (dbError) {
      console.error("Database query failed:", dbError);
    }

    // Prepare messages
    let messages = [];
    if (conversation && conversation.messages) {
      try {
        messages = Array.isArray(conversation.messages) 
          ? [...conversation.messages] 
          : JSON.parse(conversation.messages);
      } catch (parseError) {
        messages = [];
      }
    }
    
    messages.push(
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: response, timestamp: new Date().toISOString() }
    );

    if (conversation) {
      // Update existing conversation
      try {
        await db.$executeRaw`
          UPDATE conversations
          SET messages = ${JSON.stringify(messages)}, "updatedAt" = NOW()
          WHERE id = ${conversation.id}
        `;
      } catch (updateError) {
        console.error("Failed to update conversation:", updateError);
      }
    } else {
      // Create new conversation
      try {
        await db.$executeRaw`
          INSERT INTO conversations (id, "botId", "siteId", "visitorId", messages, "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${bot ? bot.id : null}, ${site ? site.id : null}, ${visitorIdFinal}, ${JSON.stringify(messages)}, NOW(), NOW())
        `;
      } catch (insertError) {
        console.error("Failed to create conversation:", insertError);
      }
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