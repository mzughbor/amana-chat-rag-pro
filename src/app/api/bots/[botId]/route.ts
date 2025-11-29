import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * GET /api/bots/[botId]
 * Get a specific bot by ID
 */
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

    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        site: {
          userId: session.user.id,
        },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        _count: {
          select: {
            documents: true,
            conversations: true,
            qaPairs: true,
          },
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: bot.id,
      siteId: bot.siteId,
      name: bot.name,
      welcomeMessage: bot.welcomeMessage,
      status: bot.status,
      provider: bot.provider,
      widgetSettings: bot.widgetSettings,
      scriptEmbedId: bot.scriptEmbedId,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
      site: bot.site,
      _count: bot._count,
    });
  } catch (error: any) {
    console.error("Error fetching bot:", error);
    return NextResponse.json(
      { error: "Failed to fetch bot", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/bots/[botId]
 * Update a bot
 */
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
    const { name, welcomeMessage, status, widgetSettings } = body;

    // Verify ownership
    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        site: {
          userId: session.user.id,
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Update bot
    const updatedBot = await db.bot.update({
      where: { id: botId },
      data: {
        ...(name && { name }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(status && { status }),
        ...(widgetSettings && { widgetSettings }),
      },
    });

    return NextResponse.json(updatedBot);
  } catch (error: any) {
    console.error("Error updating bot:", error);
    return NextResponse.json(
      { error: "Failed to update bot", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/bots/[botId]
 * Delete a bot (cascades to site)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId } = params;

    // Verify ownership
    const bot = await db.bot.findFirst({
      where: {
        id: botId,
        site: {
          userId: session.user.id,
        },
      },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Delete bot (cascades to documents, vectors, conversations, messages, qaPairs)
    await db.bot.delete({
      where: { id: botId },
    });

    // Delete site (if desired, or keep site and allow creating new bot)
    // await db.site.delete({
    //   where: { id: bot.siteId },
    // });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting bot:", error);
    return NextResponse.json(
      { error: "Failed to delete bot", message: error.message },
      { status: 500 },
    );
  }
}

