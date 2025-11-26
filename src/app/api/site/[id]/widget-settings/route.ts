import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSessionFromRequest(request);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = params.id;

    if (!siteId) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 });
    }

    // Try to get widget settings from database first
    try {
      // Check if site belongs to user using raw query
      const sites: any[] = await db.$queryRaw`
        SELECT id, "userId", "widgetSettings"
        FROM sites
        WHERE id = ${siteId} AND "userId" = ${session.user.id}
        LIMIT 1
      `;

      if (sites.length === 0) {
        return NextResponse.json({ error: "Site not found or unauthorized" }, { status: 404 });
      }

      const site = sites[0];
      return NextResponse.json({
        widgetSettings: site.widgetSettings || {},
      });
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        const { data: site, error: restError } = await supabaseRestClient
          .from('sites')
          .select('widgetSettings')
          .eq('id', siteId)
          .eq('userId', session.user.id)
          .limit(1)
          .single();
        
        if (restError) throw restError;
        
        return NextResponse.json({
          widgetSettings: site.widgetSettings || {},
        });
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 503 },
        );
      }
    }
  } catch (error: any) {
    console.error("Error fetching widget settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSessionFromRequest(request);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = params.id;
    const body = await request.json();
    const { widgetSettings } = body;

    if (!siteId) {
      return NextResponse.json({ error: "Site ID is required" }, { status: 400 });
    }

    if (!widgetSettings) {
      return NextResponse.json({ error: "Widget settings are required" }, { status: 400 });
    }

    // Try to update widget settings in database first
    try {
      // Check if site belongs to user using raw query
      const sites: any[] = await db.$queryRaw`
        SELECT id, "userId"
        FROM sites
        WHERE id = ${siteId} AND "userId" = ${session.user.id}
        LIMIT 1
      `;

      if (sites.length === 0) {
        return NextResponse.json({ error: "Site not found or unauthorized" }, { status: 404 });
      }

      // Update widget settings using raw query
      await db.$executeRaw`
        UPDATE sites
        SET "widgetSettings" = ${JSON.stringify(widgetSettings)}, "updatedAt" = NOW()
        WHERE id = ${siteId}
      `;

      // Fetch updated site
      const updatedSites: any[] = await db.$queryRaw`
        SELECT *
        FROM sites
        WHERE id = ${siteId}
      `;
      
      if (updatedSites.length > 0) {
        return NextResponse.json(updatedSites[0]);
      } else {
        throw new Error("Failed to fetch updated site");
      }
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        // Check if site belongs to user using REST API
        const { data: site, error: checkError } = await supabaseRestClient
          .from('sites')
          .select('id')
          .eq('id', siteId)
          .eq('userId', session.user.id)
          .limit(1)
          .single();
        
        if (checkError) {
          return NextResponse.json({ error: "Site not found or unauthorized" }, { status: 404 });
        }
        
        // Update widget settings using REST API
        const { data: updatedSite, error: updateError } = await supabaseRestClient
          .from('sites')
          .update({
            widgetSettings: widgetSettings,
            updatedAt: new Date().toISOString()
          })
          .eq('id', siteId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        return NextResponse.json(updatedSite);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        return NextResponse.json(
          { error: "Service unavailable. Please try again later." },
          { status: 503 },
        );
      }
    }
  } catch (error: any) {
    console.error("Error updating widget settings:", error);
    
    // Handle database connection errors specifically
    if (error.code === "P1001") {
      console.error("Database connection error - likely pooler issue");
      return NextResponse.json({ 
        error: "Database connection failed", 
        message: "Please check your database connection settings. If using Supabase Pooler, try switching to Direct Connection (port 5432)." 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: "Failed to update widget settings", message: error.message }, { status: 500 });
  }
}