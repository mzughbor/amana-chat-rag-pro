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
        include: { bots: true },
      });
      // Get the first bot from the site
      if (site?.bots && site.bots.length > 0) {
        bot = {
          widgetSettings: site.bots[0].widgetSettings,
          scriptEmbedId: site.bots[0].scriptEmbedId,
        };
      }
    }

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    }

    return NextResponse.json(
      {
        botId: siteId, // Return botId for consistency
        widgetSettings: bot.widgetSettings ?? {},
        scriptEmbedId: bot.scriptEmbedId,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  } catch (error) {
    console.error("Widget config error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

