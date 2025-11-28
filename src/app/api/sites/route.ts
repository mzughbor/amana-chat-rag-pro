import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { getSitesByUserEmail, createSite } from "~/lib/supabaseRestClient";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to fetch sites from database first
    try {
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
          // Removed widgetSettings since it doesn't exist on Site model
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(userSites);
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        const userSites = await getSitesByUserEmail(session.user.email);
        return NextResponse.json(userSites);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        throw restError;
      }
    }
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

    // Try to create site in database first
    try {
      const newSite = await db.site.create({
        data: {
          name,
          userId: session.user.id,
          // Removed widgetSettings since it doesn't exist on Site model
        },
      });

      return NextResponse.json(newSite);
    } catch (dbError: any) {
      // If database connection fails, fallback to REST API
      console.warn("Database connection failed, falling back to REST API:", dbError.message);
      
      try {
        const newSite = await createSite(session.user.id, name, {});
        return NextResponse.json(newSite);
      } catch (restError: any) {
        console.error("REST API fallback also failed:", restError.message);
        throw restError;
      }
    }
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