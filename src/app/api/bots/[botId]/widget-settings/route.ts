import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";

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

    // Check if bot belongs to user (using raw query)
    let bot: any = null;
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
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 },
      );
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

    // Check if bot belongs to user (using raw query)
    let bot: any = null;
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
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 },
      );
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or unauthorized" }, { status: 404 });
    }

    // Update widget settings (using raw query)
    let updatedBot: any = null;
    try {
      await db.$executeRaw`
        UPDATE bots
        SET "widgetSettings" = ${JSON.stringify(widgetSettings)}, "updatedAt" = NOW()
        WHERE id = ${botId}
      `;
      
      // Fetch updated bot
      const updatedBots: any[] = await db.$queryRaw`
        SELECT *
        FROM bots
        WHERE id = ${botId}
      `;
      
      if (updatedBots.length > 0) {
        updatedBot = updatedBots[0];
      }
    } catch (updateError) {
      console.error("Database update failed:", updateError);
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 },
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

