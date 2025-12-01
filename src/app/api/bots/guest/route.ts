import { NextRequest, NextResponse } from "next/server";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

/**
 * GET /api/bots/guest
 * Get all guest bots for a guestId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");

    if (!guestId || typeof guestId !== 'string') {
      return NextResponse.json(
        { error: "guestId is required" },
        { status: 400 },
      );
    }

    try {
      // Find all guest bots with this guestId
      const guestBots: any[] = await db.$queryRaw`
        SELECT 
          b.id,
          b."siteId",
          b.name,
          b."welcomeMessage",
          b.status,
          b."widgetSettings",
          b."isGuest",
          b."guestId",
          b."createdAt",
          b."updatedAt",
          s.name as site_name
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b."isGuest" = true AND b."guestId" = ${guestId} AND s."userId" = ${guestId}
        ORDER BY b."createdAt" DESC
      `;

      // Transform to bot format
      const bots = guestBots.map((bot) => ({
        id: bot.id,
        siteId: bot.siteId,
        name: bot.name,
        welcomeMessage: bot.welcomeMessage,
        status: bot.status,
        widgetSettings: bot.widgetSettings || {},
        isGuest: bot.isGuest,
        guestId: bot.guestId,
        createdAt: bot.createdAt,
        updatedAt: bot.updatedAt,
        site: {
          id: bot.siteId,
          name: bot.site_name,
        },
      }));

      return NextResponse.json(bots);
    } catch (dbError: any) {
      console.warn("Database query failed, falling back to REST API:", dbError.message);
      
      try {
        // Find guest bots via REST API
        const { data: guestBots, error: botsError } = await supabaseRestClient
          .from('bots')
          .select('id, siteId, name, welcomeMessage, status, widgetSettings, isGuest, guestId, createdAt, updatedAt, sites!inner(userId, name)')
          .eq('isGuest', true)
          .eq('guestId', guestId)
          .order('createdAt', { ascending: false });

        if (botsError) throw botsError;

        // Filter bots where site userId matches guestId
        const bots = (guestBots || [])
          .filter((bot: any) => bot.sites && bot.sites.userId === guestId)
          .map((bot: any) => ({
            id: bot.id,
            siteId: bot.siteId,
            name: bot.name,
            welcomeMessage: bot.welcomeMessage,
            status: bot.status,
            widgetSettings: bot.widgetSettings || {},
            isGuest: bot.isGuest,
            guestId: bot.guestId,
            createdAt: bot.createdAt,
            updatedAt: bot.updatedAt,
            site: {
              id: bot.siteId,
              name: bot.sites.name,
            },
          }));

        return NextResponse.json(bots);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json([]);
      }
    }
  } catch (error: any) {
    console.error("Error fetching guest bots:", error);
    return NextResponse.json(
      { error: "Failed to fetch guest bots", message: error.message },
      { status: 500 },
    );
  }
}

