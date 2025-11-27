import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = params;

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 });
    }

    // Check if bot belongs to user (using raw query with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    try {
      const bots: any[] = await db.$queryRaw`
        SELECT b.id, b."widgetSettings", b."scriptEmbedId", s."userId"
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
        LIMIT 1
      `;
      
      if (bots.length > 0) {
        bot = bots[0];
      }
    } catch (dbError: any) {
      console.warn("Database query failed, falling back to REST API:", dbError.message);
      useRestApi = true;
      
      // Try REST API fallback
      try {
        const { data: bots, error: restError } = await supabaseRestClient
          .from('bots')
          .select('id, widgetSettings, scriptEmbedId, sites(userId)')
          .eq('id', botId)
          .eq('sites.userId', session.user.id)
          .limit(1)
          .single();
        
        if (!restError && bots) {
          bot = bots;
        }
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 503 },
        );
      }
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({
      widgetSettings: bot.widgetSettings || {},
      scriptEmbedId: bot.scriptEmbedId,
    });
  } catch (error: any) {
    console.error("Error fetching widget settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = params;
    const body = await request.json();
    const { widgetSettings } = body;

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 });
    }

    if (!widgetSettings) {
      return NextResponse.json({ error: "Widget settings are required" }, { status: 400 });
    }

    // Check if bot belongs to user (using raw query with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    try {
      const bots: any[] = await db.$queryRaw`
        SELECT b.id, s."userId"
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
        LIMIT 1
      `;
      
      if (bots.length > 0) {
        bot = bots[0];
      }
    } catch (dbError: any) {
      console.warn("Database query failed, falling back to REST API:", dbError.message);
      useRestApi = true;
      
      // Try REST API fallback
      try {
        const { data: bots, error: restError } = await supabaseRestClient
          .from('bots')
          .select('id, sites(userId)')
          .eq('id', botId)
          .eq('sites.userId', session.user.id)
          .limit(1)
          .single();
        
        if (!restError && bots) {
          bot = bots;
        }
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 503 },
        );
      }
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or unauthorized" }, { status: 404 });
    }

    // Update widget settings (using raw query with REST API fallback)
    let updatedBot: any = null;
    try {
      if (!useRestApi) {
        // Use Prisma.$executeRawUnsafe for JSONB update with proper casting
        // Prisma template literals don't support ::jsonb cast, so we use unsafe method
        const widgetSettingsJson = JSON.stringify(widgetSettings);
        
        await db.$executeRawUnsafe(
          `UPDATE bots SET "widgetSettings" = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
          widgetSettingsJson,
          botId
        );
        
        // Fetch updated bot
        const updatedBots: any[] = await db.$queryRaw`
          SELECT 
            id,
            "siteId",
            name,
            "welcomeMessage",
            provider,
            status,
            "widgetSettings",
            "scriptEmbedId",
            "createdAt",
            "updatedAt"
          FROM bots
          WHERE id = ${botId}
        `;
        
        if (updatedBots.length > 0) {
          updatedBot = updatedBots[0];
        } else {
          throw new Error("Bot not found after update");
        }
      } else {
        // Use REST API for update
        const { data: updatedData, error: updateError } = await supabaseRestClient
          .from('bots')
          .update({
            widgetSettings: widgetSettings,
            updatedAt: new Date().toISOString()
          })
          .eq('id', botId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        updatedBot = updatedData;
      }
    } catch (updateError: any) {
      console.error("Database update failed:", updateError);
      console.error("Error details:", {
        message: updateError.message,
        code: updateError.code,
        botId,
        widgetSettings: JSON.stringify(widgetSettings)
      });
      
      // Return more detailed error for debugging
      return NextResponse.json(
        { 
          error: "Failed to update widget settings. Please try again later.",
          details: updateError.message || "Unknown error",
          code: updateError.code
        },
        { status: 503 },
      );
    }

    return NextResponse.json(updatedBot);
  } catch (error: any) {
    console.error("Error updating widget settings:", error);
    return NextResponse.json(
      { error: "Failed to update widget settings", message: error.message },
      { status: 500 },
    );
  }
}