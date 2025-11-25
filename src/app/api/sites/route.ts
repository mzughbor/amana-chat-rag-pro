import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sites for the authenticated user
    const userSites = await db.site.findMany({
      where: {
        user: {
          email: session.user.email,
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        widgetSettings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(userSites);
  } catch (error: any) {
    console.error("Error fetching sites:", error);
    
    // Handle database connection errors specifically
    if (error.code === "P1001") {
      console.error("Database connection error - likely pooler issue");
      return NextResponse.json({ 
        error: "Database connection failed", 
        message: "Please check your database connection settings. If using Supabase Pooler, try switching to Direct Connection (port 5432)." 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: "Failed to fetch sites", message: error.message }, { status: 500 });
  }
}

// Add POST endpoint for creating sites
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, welcomeMessage } = body;

    if (!name) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 });
    }

    // Create new site
    const newSite = await db.site.create({
      data: {
        name,
        userId: session.user.id,
        widgetSettings: {}, // Default empty settings
      },
    });

    return NextResponse.json(newSite);
  } catch (error: any) {
    console.error("Error creating site:", error);
    
    // Handle database connection errors specifically
    if (error.code === "P1001") {
      console.error("Database connection error - likely pooler issue");
      return NextResponse.json({ 
        error: "Database connection failed", 
        message: "Please check your database connection settings. If using Supabase Pooler, try switching to Direct Connection (port 5432)." 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: "Failed to create site", message: error.message }, { status: 500 });
  }
}