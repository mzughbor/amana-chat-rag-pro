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

    // Check if bot belongs to user
    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        site: {
          userId: session.user.id,
        },
      },
      select: {
        widgetSettings: true,
        scriptEmbedId: true,
      },
    });

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

    // Check if bot belongs to user
    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        site: {
          userId: session.user.id,
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found or unauthorized" }, { status: 404 });
    }

    // Update widget settings
    const updatedBot = await db.bot.update({
      where: { id: botId },
      data: { widgetSettings },
    });

    return NextResponse.json(updatedBot);
  } catch (error: any) {
    console.error("Error updating widget settings:", error);
    return NextResponse.json(
      { error: "Failed to update widget settings", message: error.message },
      { status: 500 },
    );
  }
}

