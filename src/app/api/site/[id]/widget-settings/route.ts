import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";

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