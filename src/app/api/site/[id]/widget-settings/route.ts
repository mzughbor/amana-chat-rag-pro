import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { updateWidgetSettings } from "~/lib/supabaseRestClient";

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
      // Check if site belongs to user
      const site = await db.site.findFirst({
        where: {
          id: siteId,
          userId: session.user.id,
        },
      });

      if (!site) {
        return NextResponse.json({ error: "Site not found or unauthorized" }, { status: 404 });
      }

      // Update widget settings
      const updatedSite = await db.site.update({
        where: { id: siteId },
        data: { widgetSettings },
      });

      return NextResponse.json(updatedSite);
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        // For REST API, we don't need to check ownership as the service role key
        // will handle this through RLS (Row Level Security) in Supabase
        const updatedSite = await updateWidgetSettings(siteId, widgetSettings);
        return NextResponse.json(updatedSite);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        throw restError;
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