import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { getSitesByUserEmail } from "~/lib/supabaseRestClient";

/**
 * GET /api/bots
 * Get all bots for the authenticated user (via their sites)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to fetch user's sites with their bots from database first
    try {
      // Fetch user's sites with their bots
      const userSites = await db.site.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          bot: {
            include: {
              _count: {
                select: {
                  documents: true,
                  conversations: true,
                  qaPairs: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Transform to bot format
      const bots = userSites
        .filter((site) => site.bot !== null)
        .map((site) => ({
          id: site.bot!.id,
          siteId: site.id,
          name: site.bot!.name,
          welcomeMessage: site.bot!.welcomeMessage,
          status: site.bot!.status,
          widgetSettings: site.bot!.widgetSettings,
          createdAt: site.bot!.createdAt,
          updatedAt: site.bot!.updatedAt,
          site: {
            id: site.id,
            name: site.name,
            domain: site.domain,
          },
          _count: {
            documents: site.bot!._count.documents,
            conversations: site.bot!._count.conversations,
            qaPairs: site.bot!._count.qaPairs,
          },
        }));

      return NextResponse.json(bots);
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        const userSites = await getSitesByUserEmail(session.user.email!);
        
        // Transform to bot format (simplified since REST API doesn't include bot details)
        const bots = userSites.map((site: any) => ({
          id: site.id, // Using site ID as bot ID for now
          siteId: site.id,
          name: site.name,
          welcomeMessage: null,
          status: "draft",
          widgetSettings: site.widgetSettings || {},
          createdAt: site.createdAt,
          updatedAt: site.createdAt,
          site: {
            id: site.id,
            name: site.name,
            domain: null,
          },
          _count: {
            documents: 0,
            conversations: 0,
            qaPairs: 0,
          },
        }));

        return NextResponse.json(bots);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        throw restError;
      }
    }
  } catch (error: any) {
    console.error("Error fetching bots:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/bots
 * Create a new site with its bot
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { siteName, botName, welcomeMessage, apiKey } = body;

    if (!siteName || !botName) {
      return NextResponse.json(
        { error: "Site name and bot name are required" },
        { status: 400 },
      );
    }

    // Try to create site and bot in a transaction
    try {
      // Create site and bot in a transaction
      const result = await db.$transaction(async (tx) => {
        // Create site
        const site = await tx.site.create({
          data: {
            name: siteName,
            userId: session.user.id!,
            settings: {},
          },
        });

        // Create bot for the site
        const bot = await tx.bot.create({
          data: {
            siteId: site.id,
            name: botName,
            welcomeMessage: welcomeMessage || null,
            openaiApiKeyEncrypted: apiKey || null, // Will be encrypted by the API key endpoint
            status: "draft",
            widgetSettings: {},
          },
        });

        return { site, bot };
      });

      return NextResponse.json({
        id: result.bot.id,
        siteId: result.site.id,
        name: result.bot.name,
        welcomeMessage: result.bot.welcomeMessage,
        status: result.bot.status,
        createdAt: result.bot.createdAt,
      });
    } catch (dbError: any) {
      // If database connection fails, return error
      console.error("Database connection failed when creating bot:", dbError.message);
      return NextResponse.json(
        { error: "Database connection failed", message: "Unable to create bot at this time. Please try again later." },
        { status: 503 },
      );
    }
  } catch (error: any) {
    console.error("Error creating bot:", error);
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A bot already exists for this site" },
        { status: 409 },
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create bot", message: error.message },
      { status: 500 },
    );
  }
}