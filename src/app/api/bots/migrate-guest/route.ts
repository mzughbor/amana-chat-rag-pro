import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

/**
 * POST /api/bots/migrate-guest
 * Migrate guest bots to authenticated user account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { guestId } = body;

    if (!guestId || typeof guestId !== 'string') {
      return NextResponse.json(
        { error: "guestId is required" },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    try {
      // Find all guest bots with this guestId
      const guestBots: any[] = await db.$queryRaw`
        SELECT b.id, b."siteId", s.id as site_id
        FROM bots b
        JOIN sites s ON b."siteId" = s.id
        WHERE b."isGuest" = true AND b."guestId" = ${guestId} AND s."userId" = ${guestId}
      `;

      if (guestBots.length === 0) {
        return NextResponse.json({
          success: true,
          migrated: 0,
          message: "No guest bots found to migrate",
        });
      }

      // Migrate each bot's site and bot
      let migratedCount = 0;
      
      for (const bot of guestBots) {
        try {
          // Update site userId
          await db.$executeRaw`
            UPDATE sites
            SET "userId" = ${userId}, "updatedAt" = NOW()
            WHERE id = ${bot.siteId}
          `;

          // Update bot to remove guest flags
          await db.$executeRaw`
            UPDATE bots
            SET "isGuest" = false, "guestId" = NULL, "updatedAt" = NOW()
            WHERE id = ${bot.id}
          `;

          migratedCount++;
        } catch (updateError: any) {
          console.error(`Error migrating bot ${bot.id}:`, updateError);
          // Continue with other bots even if one fails
        }
      }

      return NextResponse.json({
        success: true,
        migrated: migratedCount,
        message: `Successfully migrated ${migratedCount} bot(s)`,
      });
    } catch (dbError: any) {
      console.warn("Database migration failed, falling back to REST API:", dbError.message);
      
      try {
        // Find guest bots via REST API
        const { data: guestBots, error: botsError } = await supabaseRestClient
          .from('bots')
          .select('id, siteId, sites!inner(userId)')
          .eq('isGuest', true)
          .eq('guestId', guestId);

        if (botsError) throw botsError;

        // Filter bots where site userId matches guestId
        const botsToMigrate = (guestBots || []).filter((bot: any) => 
          bot.sites && bot.sites.userId === guestId
        );

        if (botsToMigrate.length === 0) {
          return NextResponse.json({
            success: true,
            migrated: 0,
            message: "No guest bots found to migrate",
          });
        }

        let migratedCount = 0;

        for (const bot of botsToMigrate) {
          try {
            // Update site userId
            const { error: siteError } = await supabaseRestClient
              .from('sites')
              .update({ userId: userId, updatedAt: new Date().toISOString() })
              .eq('id', bot.siteId);

            if (siteError) throw siteError;

            // Update bot to remove guest flags
            const { error: botError } = await supabaseRestClient
              .from('bots')
              .update({ 
                isGuest: false, 
                guestId: null, 
                updatedAt: new Date().toISOString() 
              })
              .eq('id', bot.id);

            if (botError) throw botError;

            migratedCount++;
          } catch (updateError: any) {
            console.error(`Error migrating bot ${bot.id}:`, updateError);
            // Continue with other bots even if one fails
          }
        }

        return NextResponse.json({
          success: true,
          migrated: migratedCount,
          message: `Successfully migrated ${migratedCount} bot(s)`,
        });
      } catch (restError: any) {
        console.error("REST API migration also failed:", restError.message);
        return NextResponse.json(
          { error: "Failed to migrate guest bots", message: restError.message },
          { status: 500 },
        );
      }
    }
  } catch (error: any) {
    console.error("Error migrating guest bots:", error);
    return NextResponse.json(
      { error: "Failed to migrate guest bots", message: error.message },
      { status: 500 },
    );
  }
}

