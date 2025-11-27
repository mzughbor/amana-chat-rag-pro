import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { retrieveContext, buildContext } from "~/server/services/ragService";
import { decryptApiKey } from "~/server/services/encryption";
import { supabaseRestClient } from "~/lib/supabaseRestClient";
import OpenAI from "openai";
import crypto from "crypto";

type ConversationRecord = {
  id: string;
  botId?: string | null;
  siteId?: string | null;
};

type MessageRow = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
};

const mapMessageRow = (row: MessageRow) => ({
  id: row.id,
  conversationId: row.conversationId,
  sender: row.role === "assistant" ? "assistant" : "user",
  content: row.content,
  createdAt: row.createdAt,
});

async function getBotOrSite(siteId: string) {
  let bot: any = null;
  let site: any = null;
  let useRestApi = false;

  try {
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
  } catch (dbError: any) {
    console.warn("Database connection failed, falling back to REST API:", dbError.message);
    useRestApi = true;

    try {
      const { data: botData, error: botError } = await supabaseRestClient
        .from("bots")
        .select("id, siteId, openaiApiKeyEncrypted, sites(apiKeyEncrypted)")
        .eq("id", siteId)
        .limit(1)
        .single();

      if (botError) {
        const { data: siteBotData, error: siteBotError } = await supabaseRestClient
          .from("bots")
          .select("id, siteId, openaiApiKeyEncrypted, sites(apiKeyEncrypted)")
          .eq("siteId", siteId)
          .limit(1)
          .single();

        if (!siteBotError && siteBotData) {
          bot = siteBotData;
        }
      } else if (botData) {
        bot = botData;
      }
    } catch (restError: any) {
      console.error("REST API fallback also failed:", restError.message);
      throw restError;
    }
  }

  if (!bot) {
    try {
      if (!useRestApi) {
        const sites: any[] = await db.$queryRaw`
          SELECT id, "apiKeyEncrypted"
          FROM sites
          WHERE id = ${siteId}
          LIMIT 1
        `;

        if (sites.length > 0) {
          site = sites[0];
        }
      } else {
        const { data: siteData, error: siteError } = await supabaseRestClient
          .from("sites")
          .select("id, apiKeyEncrypted")
          .eq("id", siteId)
          .limit(1)
          .single();

        if (!siteError && siteData) {
          site = siteData;
        }
      }
    } catch (error) {
      console.error("Failed to fetch site:", error);
    }
  }

  return { bot, site, useRestApi };
}

async function getConversationById(
  conversationId: string,
  useRestApi: boolean,
): Promise<ConversationRecord | null> {
  try {
    if (!useRestApi) {
      const rows: ConversationRecord[] = await db.$queryRaw`
        SELECT id, "botId", "siteId"
        FROM conversations
        WHERE id = ${conversationId}
        LIMIT 1
      `;
      return rows[0] ?? null;
    }

    const { data, error } = await supabaseRestClient
      .from("conversations")
      .select("id, botId, siteId")
      .eq("id", conversationId)
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data as ConversationRecord;
  } catch (error) {
    console.warn("getConversationById failed:", error);
    return null;
  }
}

async function findConversationForVisitor(
  contextId: string,
  visitorId: string,
  useRestApi: boolean,
): Promise<ConversationRecord | null> {
  try {
    if (!useRestApi) {
      const rows: ConversationRecord[] = await db.$queryRaw`
        SELECT id, "botId", "siteId"
        FROM conversations
        WHERE COALESCE("botId", "siteId") = ${contextId} AND "visitorId" = ${visitorId}
        ORDER BY "updatedAt" DESC
        LIMIT 1
      `;
      return rows[0] ?? null;
    }

    const { data, error } = await supabaseRestClient
      .from("conversations")
      .select("id, botId, siteId")
      .eq("visitorId", visitorId)
      .or(`botId.eq.${contextId},siteId.eq.${contextId}`)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data as ConversationRecord;
  } catch (error) {
    console.warn("findConversationForVisitor failed:", error);
    return null;
  }
}

async function createConversation(
  botId: string | null,
  siteId: string | null,
  visitorId: string,
  useRestApi: boolean,
): Promise<ConversationRecord> {
  const id = crypto.randomUUID();
  if (!useRestApi) {
    await db.$executeRaw`
      INSERT INTO conversations (id, "botId", "siteId", "visitorId", messages, "createdAt", "updatedAt")
      VALUES (${id}, ${botId}, ${siteId}, ${visitorId}, '[]'::jsonb, NOW(), NOW())
    `;
    return { id, botId, siteId };
  }

  const now = new Date().toISOString();
  const { error } = await supabaseRestClient
    .from("conversations")
    .insert([
      {
        id,
        botId,
        siteId,
        visitorId,
        messages: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);

  if (error) {
    throw error;
  }

  return { id, botId, siteId };
}

async function fetchMessagesForConversation(
  conversationId: string,
  useRestApi: boolean,
): Promise<MessageRow[]> {
  if (!useRestApi) {
    return db.$queryRaw`
      SELECT id, "conversationId", role, content, "createdAt"
      FROM messages
      WHERE "conversationId" = ${conversationId}
      ORDER BY "createdAt" ASC
    `;
  }

  const { data, error } = await supabaseRestClient
    .from("messages")
    .select("id, conversationId, role, content, createdAt")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as MessageRow[];
}

async function insertMessageRecord(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  useRestApi: boolean,
): Promise<{ id: string; conversationId: string; sender: Sender; content: string; createdAt: string }> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  if (!useRestApi) {
    await db.$executeRaw`
      INSERT INTO messages (id, "conversationId", role, content, "createdAt")
      VALUES (${id}, ${conversationId}, ${role}, ${content}, ${createdAt})
    `;
    await db.$executeRaw`
      UPDATE conversations SET "updatedAt" = NOW() WHERE id = ${conversationId}
    `;
  } else {
    const { error } = await supabaseRestClient
      .from("messages")
      .insert([
        {
          id,
          conversationId,
          role,
          content,
          createdAt,
        },
      ]);

    if (error) {
      throw error;
    }

    await supabaseRestClient
      .from("conversations")
      .update({ updatedAt: createdAt })
      .eq("id", conversationId);
  }

  return {
    id,
    conversationId,
    sender: role,
    content,
    createdAt,
  };
}

type Sender = "user" | "assistant";

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } },
) {
  try {
    const { siteId } = params;
    const url = new URL(request.url);
    const visitorId = url.searchParams.get("visitorId");
    const providedConversationId = url.searchParams.get("conversationId");

    if (!visitorId && !providedConversationId) {
      return NextResponse.json(
        { error: "visitorId or conversationId is required" },
        { status: 400 },
      );
    }

    const { bot, site, useRestApi } = await getBotOrSite(siteId);

    if (!bot && !site) {
      return NextResponse.json({ error: "Bot or site not found" }, { status: 404 });
    }

    const contextId = bot ? bot.id : siteId;
    let conversation: ConversationRecord | null = null;

    if (providedConversationId) {
      conversation = await getConversationById(providedConversationId, useRestApi);
    }

    if (!conversation && visitorId) {
      conversation = await findConversationForVisitor(contextId, visitorId, useRestApi);
    }

    if (!conversation) {
      return NextResponse.json({
        conversationId: null,
        messages: [],
      });
    }

    const rows = await fetchMessagesForConversation(conversation.id, useRestApi);

    return NextResponse.json({
      conversationId: conversation.id,
      messages: rows.map(mapMessageRow),
    });
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to load messages",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } },
) {
  try {
    const { siteId } = params;
    const body = await request.json();
    const { message, visitorId, conversationId: providedConversationId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const { bot, site, useRestApi } = await getBotOrSite(siteId);

    if (!bot && !site) {
      return NextResponse.json({ error: "Bot or site not found" }, { status: 404 });
    }

    // Get API key from bot or site
    let apiKeyEncrypted = null;
    if (bot) {
      apiKeyEncrypted = bot.openaiApiKeyEncrypted || (bot.sites ? bot.sites.apiKeyEncrypted : null);
    } else if (site) {
      apiKeyEncrypted = site.apiKeyEncrypted;
    }

    if (!apiKeyEncrypted) {
      return NextResponse.json(
        { error: "API key not configured for this bot/site" },
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

    const apiKey = decryptApiKey(apiKeyEncrypted, encryptionKey);
    const contextId = bot ? bot.id : siteId;
    const visitorIdFinal = visitorId ?? crypto.randomUUID();

    let conversation: ConversationRecord | null = null;
    if (providedConversationId) {
      conversation = await getConversationById(providedConversationId, useRestApi);
    }
    if (!conversation) {
      conversation = await findConversationForVisitor(contextId, visitorIdFinal, useRestApi);
    }
    if (!conversation) {
      conversation = await createConversation(
        bot ? bot.id : null,
        bot ? bot.siteId : site?.id ?? null,
        visitorIdFinal,
        useRestApi,
      );
    }

    const userMessageRecord = await insertMessageRecord(
      conversation.id,
      "user",
      message,
      useRestApi,
    );

    const relevantChunks = await retrieveContext(message, contextId, apiKey, 5);
    const context = buildContext(relevantChunks);

    const systemPrompt = `You are a helpful AI assistant for a business. Answer questions based on the provided context. If the answer is not in the context, say so politely.

Context:
${context}

Answer the user's question based on the context above. Be concise and helpful.`;

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

    const response =
      completion.choices[0]?.message?.content ??
      "I'm sorry, I couldn't generate a response.";

    const assistantMessageRecord = await insertMessageRecord(
      conversation.id,
      "assistant",
      response,
      useRestApi,
    );

    return NextResponse.json({
      response,
      visitorId: visitorIdFinal,
      conversationId: conversation.id,
      message: assistantMessageRecord,
      userMessage: userMessageRecord,
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