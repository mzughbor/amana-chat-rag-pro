import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } },
) {
  try {
    const { siteId } = params;

    // Try to find bot by ID first (for backward compatibility, siteId might be botId)
    let bot = await db.bot.findUnique({
      where: { id: siteId },
      select: { widgetSettings: true, scriptEmbedId: true },
    });

    // If not found, try finding by siteId
    if (!bot) {
      const site = await db.site.findUnique({
        where: { id: siteId },
        include: { bot: true },
      });
      if (site?.bot) {
        bot = {
          widgetSettings: site.bot.widgetSettings,
          scriptEmbedId: site.bot.scriptEmbedId,
        };
      }
    }

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json({
      botId: siteId, // Return botId for consistency
      widgetSettings: bot.widgetSettings ?? {},
      scriptEmbedId: bot.scriptEmbedId,
    });
  } catch (error) {
    console.error("Widget config error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

