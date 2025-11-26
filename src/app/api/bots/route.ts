import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { getSitesByUserEmail, supabaseRestClient } from "~/lib/supabaseRestClient";
import crypto from "crypto";

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
      // Use raw query to match actual schema
      const sites: any[] = await db.$queryRaw`
        SELECT 
          s.id as site_id,
          s."userId",
          s.name as site_name,
          s.domain,
          s."createdAt" as site_created_at,
          b.id as bot_id,
          b.name as bot_name,
          b."welcomeMessage",
          b.status,
          b."widgetSettings",
          b."createdAt" as bot_created_at,
          b."updatedAt" as bot_updated_at
        FROM sites s
        LEFT JOIN bots b ON s.id = b."siteId"
        WHERE s."userId" = ${session.user.id}
        ORDER BY s."createdAt" DESC
      `;

      // Transform to bot format
      const bots = sites
        .filter((site) => site.bot_id !== null)
        .map((site) => ({
          id: site.bot_id,
          siteId: site.site_id,
          name: site.bot_name,
          welcomeMessage: site.welcomeMessage,
          status: site.status,
          widgetSettings: site.widgetSettings || {},
          createdAt: site.bot_created_at,
          updatedAt: site.bot_updated_at,
          site: {
            id: site.site_id,
            name: site.site_name,
            domain: site.domain,
          },
        }));

      return NextResponse.json(bots);
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        // Try to get sites with bots via REST API
        const { data: sites, error: sitesError } = await supabaseRestClient
          .from('sites')
          .select('id, name, domain, userId, createdAt, bots(id, name, welcomeMessage, status, widgetSettings, createdAt, updatedAt)')
          .eq('userId', session.user.id)
          .order('createdAt', { ascending: false });

        if (sitesError) throw sitesError;

        // Transform to bot format - handle both array and object formats
        const bots = sites
          .map((site: any) => {
            // Handle case where bots might be an array or single object
            const siteBots = Array.isArray(site.bots) ? site.bots : (site.bots ? [site.bots] : []);
            return siteBots.map((bot: any) => ({
              id: bot.id,
              siteId: site.id,
              name: bot.name,
              welcomeMessage: bot.welcomeMessage,
              status: bot.status,
              widgetSettings: bot.widgetSettings || {},
              createdAt: bot.createdAt,
              updatedAt: bot.updatedAt,
              site: {
                id: site.id,
                name: site.name,
                domain: site.domain,
              },
            }));
          })
          .flat()
          // Filter out any null or undefined bots
          .filter((bot: any) => bot && bot.id);

        return NextResponse.json(bots);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        // Return empty array instead of throwing error to prevent dashboard from breaking
        return NextResponse.json([]);
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

    // Try to create site and bot in database first
    try {
      // Use raw queries to match actual schema
      const siteId = crypto.randomUUID();
      const botId = crypto.randomUUID();
      
      // Create site
      await db.$executeRaw`
        INSERT INTO sites (id, "userId", name, "createdAt", "updatedAt")
        VALUES (${siteId}, ${session.user.id}, ${siteName}, NOW(), NOW())
      `;
      
      // Create bot
      await db.$executeRaw`
        INSERT INTO bots (id, "siteId", name, "welcomeMessage", status, "widgetSettings", "createdAt", "updatedAt")
        VALUES (${botId}, ${siteId}, ${botName}, ${welcomeMessage || null}, 'draft', '{}', NOW(), NOW())
      `;
      
      // Fetch the created bot
      const bots: any[] = await db.$queryRaw`
        SELECT 
          b.id,
          b."siteId",
          b.name,
          b."welcomeMessage",
          b.status,
          b."createdAt",
          b."updatedAt",
          s.name as site_name
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b.id = ${botId}
      `;
      
      if (bots.length > 0) {
        const bot = bots[0];
        return NextResponse.json({
          id: bot.id,
          siteId: bot.siteId,
          name: bot.name,
          welcomeMessage: bot.welcomeMessage,
          status: bot.status,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          site: {
            name: bot.site_name
          }
        });
      } else {
        throw new Error("Failed to fetch created bot");
      }
    } catch (dbError: any) {
      // If database connection fails, try REST API
      console.warn("Database connection failed when creating bot, falling back to REST API:", dbError.message);
      
      try {
        // Check if Supabase client is properly initialized
        if (!supabaseRestClient) {
          throw new Error("Supabase REST client not initialized");
        }
        
        // Create site via REST API
        const { data: siteData, error: siteError } = await supabaseRestClient
          .from('sites')
          .insert([{
            id: crypto.randomUUID(),
            userId: session.user.id,
            name: siteName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (siteError) throw siteError;
        
        // Create bot via REST API
        const botId = crypto.randomUUID();
        const { data: botData, error: botError } = await supabaseRestClient
          .from('bots')
          .insert([{
            id: botId,
            siteId: siteData.id,
            name: botName,
            welcomeMessage: welcomeMessage || null,
            status: 'draft',
            widgetSettings: '{}',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (botError) throw botError;
        
        return NextResponse.json({
          id: botData.id,
          siteId: botData.siteId,
          name: botData.name,
          welcomeMessage: botData.welcomeMessage,
          status: botData.status,
          createdAt: botData.createdAt,
          updatedAt: botData.updatedAt,
          site: {
            name: siteData.name
          }
        });
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Unable to create bot at this time. Please try again later." },
          { status: 503 },
        );
      }
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