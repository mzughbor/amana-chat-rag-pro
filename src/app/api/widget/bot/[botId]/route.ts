import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

/**
 * Public endpoint to get bot info for widgets
 * This endpoint does not require authentication and is used by embedded widgets
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  try {
    const { botId } = params;

    if (!botId) {
      return NextResponse.json(
        { error: "Bot ID is required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        },
      );
    }

    // Try to find bot by ID (no auth required for public widget access)
    let bot: any = null;
    let useRestApi = false;

    try {
      const bots: any[] = await db.$queryRaw`
        SELECT b.id, b.name, b."welcomeMessage", b."widgetSettings", b."siteId"
        FROM bots b
        WHERE b.id = ${botId}
        LIMIT 1
      `;

      if (bots.length > 0) {
        bot = bots[0];
      }
    } catch (dbError: any) {
      console.warn("Database query failed, falling back to REST API:", dbError.message);
      useRestApi = true;

      try {
        const { data: botData, error: botError } = await supabaseRestClient
          .from("bots")
          .select("id, name, welcomeMessage, widgetSettings, siteId")
          .eq("id", botId)
          .limit(1)
          .single();

        if (!botError && botData) {
          bot = botData;
        }
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          {
            status: 503,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          },
        );
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

    // Return public bot info (no sensitive data)
    return NextResponse.json(
      {
        id: bot.id,
        name: bot.name || "Chat Assistant",
        welcomeMessage: bot.welcomeMessage,
        widgetSettings: bot.widgetSettings ?? {},
        siteId: bot.siteId,
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
    console.error("Widget bot info error:", error);
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

