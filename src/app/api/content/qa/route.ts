import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";
import { generateEmbeddings } from "~/server/services/embeddingService";
import { encryptApiKey, decryptApiKey } from "~/server/services/encryption";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSessionFromRequest(request);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, answer, botId } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 },
      );
    }

    // Get user's bot (using raw query to avoid Prisma schema issues, with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    
    // If botId is provided, use it directly
    if (botId) {
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: botData, error: botError } = await supabaseRestClient
            .from('bots')
            .select('id, siteId, name, openaiApiKeyEncrypted, sites(userId)')
            .eq('id', botId)
            .eq('sites.userId', session.user.id)
            .limit(1)
            .single();
          
          if (!botError && botData) {
            bot = {
              id: botData.id,
              siteId: botData.siteId,
              name: botData.name,
              openaiApiKeyEncrypted: botData.openaiApiKeyEncrypted,
              userId: session.user.id // We know this is the correct user since we filtered by userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    } else {
      // If no botId provided, try to get the first bot for the user
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: sites, error: siteError } = await supabaseRestClient
            .from('sites')
            .select('id, userId, bots(id, siteId, name, openaiApiKeyEncrypted)')
            .eq('userId', session.user.id)
            .limit(1)
            .single();
          
          if (!siteError && sites && sites.bots && sites.bots.length > 0) {
            bot = {
              id: sites.bots[0].id,
              siteId: sites.bots[0].siteId,
              name: sites.bots[0].name,
              openaiApiKeyEncrypted: sites.bots[0].openaiApiKeyEncrypted,
              userId: sites.userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    }

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found. Please create a bot first." },
        { status: 404 },
      );
    }

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

    // Create Q&A pair (using raw query with REST API fallback)
    let qaPair: any = null;
    try {
      const qaId = crypto.randomUUID();
      const qaPairs: any[] = await db.$queryRaw`
        INSERT INTO qa_pairs (id, "botId", question, answer, status, "createdAt", "updatedAt")
        VALUES (${qaId}, ${bot.id}, ${question}, ${answer}, 'active', NOW(), NOW())
        RETURNING id, "botId", question, answer, status, "createdAt", "updatedAt"
      `;
      
      if (qaPairs.length > 0) {
        qaPair = qaPairs[0];
      }
    } catch (insertError: any) {
      console.error("Failed to create Q&A pair:", insertError);
      console.error("Error details:", {
        message: insertError.message,
        code: insertError.code,
        botId: bot.id,
        question: question.substring(0, 50)
      });
      if (useRestApi) {
        // Try REST API for Q&A pair creation
        try {
          const { data: qaData, error: qaError } = await supabaseRestClient
            .from('qa_pairs')
            .insert({
              id: crypto.randomUUID(),
              botId: bot.id,
              question: question,
              answer: answer,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .select()
            .single();
          
          if (!qaError && qaData) {
            qaPair = qaData;
          } else {
            throw new Error(qaError?.message || "Failed to create Q&A pair via REST API");
          }
        } catch (restInsertError: any) {
          console.error("REST API Q&A pair creation also failed:", restInsertError);
          return NextResponse.json(
            { error: "Failed to create Q&A pair" },
            { status: 500 },
          );
        }
      } else {
        console.error("Failed to create Q&A pair:", insertError);
        return NextResponse.json(
          { error: "Failed to create Q&A pair" },
          { status: 500 },
        );
      }
    }

    // Generate embedding for the question (for retrieval)
    const questionEmbedding = await generateEmbeddings([question], apiKey);
    const embeddingString = `[${questionEmbedding[0]?.join(",")}]`;

    // Store as vector for retrieval using parameterized query (with REST API fallback)
    try {
      if (!useRestApi) {
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
      } else {
        // Use REST API for vector insertion
        await supabaseRestClient
          .from('vectors')
          .insert({
            id: crypto.randomUUID(),
            botId: bot.id,
            documentId: null,
            chunkId: 0,
            chunkText: `Q: ${question}\nA: ${answer}`,
            embedding: embeddingString,
            metadata: { type: "qa", qaId: qaPair.id }
          });
      }
    } catch (vectorError: any) {
      console.error("Failed to store Q&A vector:", vectorError);
      // This is not critical, so we continue
    }

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

    const body = await request.json();
    const { id, question, answer, botId } = body;

    if (!id || !question || !answer) {
      return NextResponse.json(
        { error: "ID, question and answer are required" },
        { status: 400 },
      );
    }

    // Get user's bot (using raw query to avoid Prisma schema issues, with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    
    // If botId is provided, use it directly
    if (botId) {
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: botData, error: botError } = await supabaseRestClient
            .from('bots')
            .select('id, siteId, name, openaiApiKeyEncrypted, sites(userId)')
            .eq('id', botId)
            .eq('sites.userId', session.user.id)
            .limit(1)
            .single();
          
          if (!botError && botData) {
            bot = {
              id: botData.id,
              siteId: botData.siteId,
              name: botData.name,
              openaiApiKeyEncrypted: botData.openaiApiKeyEncrypted,
              userId: session.user.id // We know this is the correct user since we filtered by userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    } else {
      // If no botId provided, try to get the first bot for the user
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: sites, error: siteError } = await supabaseRestClient
            .from('sites')
            .select('id, userId, bots(id, siteId, name, openaiApiKeyEncrypted)')
            .eq('userId', session.user.id)
            .limit(1)
            .single();
          
          if (!siteError && sites && sites.bots && sites.bots.length > 0) {
            bot = {
              id: sites.bots[0].id,
              siteId: sites.bots[0].siteId,
              name: sites.bots[0].name,
              openaiApiKeyEncrypted: sites.bots[0].openaiApiKeyEncrypted,
              userId: sites.userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    }

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found. Please create a bot first." },
        { status: 404 },
      );
    }

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

    // Check if Q&A pair belongs to user's bot (using raw query with REST API fallback)
    let existingQaPair: any = null;
    try {
      const qaPairs: any[] = await db.$queryRaw`
        SELECT id, "botId", question, answer
        FROM qa_pairs
        WHERE id = ${id} AND "botId" = ${bot.id}
        LIMIT 1
      `;
      
      if (qaPairs.length > 0) {
        existingQaPair = qaPairs[0];
      }
    } catch (dbError: any) {
      if (useRestApi) {
        // Try REST API for Q&A pair lookup
        try {
          const { data: qaData, error: qaError } = await supabaseRestClient
            .from('qa_pairs')
            .select('id, botId, question, answer')
            .eq('id', id)
            .eq('botId', bot.id)
            .limit(1)
            .single();
          
          if (!qaError && qaData) {
            existingQaPair = qaData;
          }
        } catch (restError: any) {
          console.error("REST API Q&A pair lookup also failed:", restError);
        }
      } else {
        console.error("Failed to lookup Q&A pair:", dbError);
      }
    }

    if (!existingQaPair) {
      return NextResponse.json(
        { error: "Q&A pair not found or unauthorized" },
        { status: 404 },
      );
    }

    // Update Q&A pair (using raw query with REST API fallback)
    let updatedQaPair: any = null;
    try {
      const qaPairs: any[] = await db.$queryRaw`
        UPDATE qa_pairs
        SET question = ${question}, answer = ${answer}, "updatedAt" = NOW()
        WHERE id = ${id}
        RETURNING id, "botId", question, answer, status, "createdAt", "updatedAt"
      `;
      
      if (qaPairs.length > 0) {
        updatedQaPair = qaPairs[0];
      }
    } catch (updateError: any) {
      if (useRestApi) {
        // Try REST API for Q&A pair update
        try {
          const { data: qaData, error: qaError } = await supabaseRestClient
            .from('qa_pairs')
            .update({
              question: question,
              answer: answer,
              updatedAt: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
          
          if (!qaError && qaData) {
            updatedQaPair = qaData;
          } else {
            throw new Error(qaError?.message || "Failed to update Q&A pair via REST API");
          }
        } catch (restUpdateError: any) {
          console.error("REST API Q&A pair update also failed:", restUpdateError);
          return NextResponse.json(
            { error: "Failed to update Q&A pair" },
            { status: 500 },
          );
        }
      } else {
        console.error("Failed to update Q&A pair:", updateError);
        return NextResponse.json(
          { error: "Failed to update Q&A pair" },
          { status: 500 },
        );
      }
    }

    // Delete old vector embeddings for this Q&A pair (with REST API fallback)
    try {
      if (!useRestApi) {
        await db.$executeRaw`
          DELETE FROM vectors 
          WHERE "botId" = ${bot.id} 
          AND metadata->>'type' = 'qa' 
          AND metadata->>'qaId' = ${id}
        `;
      } else {
        // Use REST API for vector deletion
        await supabaseRestClient
          .from('vectors')
          .delete()
          .eq('botId', bot.id)
          .eq('metadata->>type', 'qa')
          .eq('metadata->>qaId', id);
      }
    } catch (deleteError: any) {
      console.warn("Failed to delete old Q&A vectors:", deleteError);
      // This is not critical, so we continue
    }

    // Generate new embedding for the updated question
    const questionEmbedding = await generateEmbeddings([question], apiKey);
    const embeddingString = `[${questionEmbedding[0]?.join(",")}]`;

    // Store updated vector for retrieval (with REST API fallback)
    try {
      if (!useRestApi) {
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
      } else {
        // Use REST API for vector insertion
        await supabaseRestClient
          .from('vectors')
          .insert({
            id: crypto.randomUUID(),
            botId: bot.id,
            documentId: null,
            chunkId: 0,
            chunkText: `Q: ${question}\nA: ${answer}`,
            embedding: embeddingString,
            metadata: { type: "qa", qaId: id }
          });
      }
    } catch (vectorError: any) {
      console.error("Failed to store updated Q&A vector:", vectorError);
      // This is not critical, so we continue
    }

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

    const body = await request.json();
    const { id, botId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 },
      );
    }

    // Get user's bot (using raw query to avoid Prisma schema issues, with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    
    // If botId is provided, use it directly
    if (botId) {
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: botData, error: botError } = await supabaseRestClient
            .from('bots')
            .select('id, siteId, name, openaiApiKeyEncrypted, sites(userId)')
            .eq('id', botId)
            .eq('sites.userId', session.user.id)
            .limit(1)
            .single();
          
          if (!botError && botData) {
            bot = {
              id: botData.id,
              siteId: botData.siteId,
              name: botData.name,
              openaiApiKeyEncrypted: botData.openaiApiKeyEncrypted,
              userId: session.user.id // We know this is the correct user since we filtered by userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    } else {
      // If no botId provided, try to get the first bot for the user
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, b."openaiApiKeyEncrypted", s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: sites, error: siteError } = await supabaseRestClient
            .from('sites')
            .select('id, userId, bots(id, siteId, name, openaiApiKeyEncrypted)')
            .eq('userId', session.user.id)
            .limit(1)
            .single();
          
          if (!siteError && sites && sites.bots && sites.bots.length > 0) {
            bot = {
              id: sites.bots[0].id,
              siteId: sites.bots[0].siteId,
              name: sites.bots[0].name,
              openaiApiKeyEncrypted: sites.bots[0].openaiApiKeyEncrypted,
              userId: sites.userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    }

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found. Please create a bot first." },
        { status: 404 },
      );
    }

    // Check if Q&A pair belongs to user's bot (using raw query with REST API fallback)
    let existingQaPair: any = null;
    try {
      const qaPairs: any[] = await db.$queryRaw`
        SELECT id, "botId"
        FROM qa_pairs
        WHERE id = ${id} AND "botId" = ${bot.id}
        LIMIT 1
      `;
      
      if (qaPairs.length > 0) {
        existingQaPair = qaPairs[0];
      }
    } catch (dbError: any) {
      if (useRestApi) {
        // Try REST API for Q&A pair lookup
        try {
          const { data: qaData, error: qaError } = await supabaseRestClient
            .from('qa_pairs')
            .select('id, botId')
            .eq('id', id)
            .eq('botId', bot.id)
            .limit(1)
            .single();
          
          if (!qaError && qaData) {
            existingQaPair = qaData;
          }
        } catch (restError: any) {
          console.error("REST API Q&A pair lookup also failed:", restError);
        }
      } else {
        console.error("Failed to lookup Q&A pair:", dbError);
      }
    }

    if (!existingQaPair) {
      return NextResponse.json(
        { error: "Q&A pair not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete Q&A pair (using raw query with REST API fallback)
    try {
      if (!useRestApi) {
        await db.$executeRaw`
          DELETE FROM qa_pairs
          WHERE id = ${id}
        `;
      } else {
        // Use REST API for Q&A pair deletion
        await supabaseRestClient
          .from('qa_pairs')
          .delete()
          .eq('id', id);
      }
    } catch (deleteError: any) {
      if (useRestApi) {
        // Try REST API for Q&A pair deletion
        try {
          await supabaseRestClient
            .from('qa_pairs')
            .delete()
            .eq('id', id);
        } catch (restDeleteError: any) {
          console.error("REST API Q&A pair deletion also failed:", restDeleteError);
          return NextResponse.json(
            { error: "Failed to delete Q&A pair" },
            { status: 500 },
          );
        }
      } else {
        console.error("Failed to delete Q&A pair:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete Q&A pair" },
          { status: 500 },
        );
      }
    }

    // Delete associated vector embeddings (with REST API fallback)
    try {
      if (!useRestApi) {
        await db.$executeRaw`
          DELETE FROM vectors 
          WHERE "botId" = ${bot.id} 
          AND metadata->>'type' = 'qa' 
          AND metadata->>'qaId' = ${id}
        `;
      } else {
        // Use REST API for vector deletion
        await supabaseRestClient
          .from('vectors')
          .delete()
          .eq('botId', bot.id)
          .eq('metadata->>type', 'qa')
          .eq('metadata->>qaId', id);
      }
    } catch (vectorDeleteError: any) {
      console.warn("Failed to delete Q&A vectors:", vectorDeleteError);
      // This is not critical, so we continue
    }

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