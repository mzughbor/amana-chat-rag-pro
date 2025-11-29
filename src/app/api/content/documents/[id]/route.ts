import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseAdmin } from "~/lib/supabase";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSessionFromRequest(request);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // Parse body to get botId if provided
    let botId = null;
    try {
      const body = await request.json();
      botId = body.botId;
    } catch (e) {
      // If no body or invalid JSON, continue without botId
    }

    // Get user's bot (using raw query to avoid Prisma schema issues, with REST API fallback)
    let bot: any = null;
    let useRestApi = false;
    
    // If botId is provided, use it directly
    if (botId) {
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE b.id = ${botId} AND s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: botData, error: botError } = await supabaseRestClient
            .from('bots')
            .select('id, siteId, name, sites(userId)')
            .eq('id', botId)
            .eq('sites.userId', session.user.id)
            .limit(1)
            .single();
          
          if (!botError && botData) {
            bot = {
              id: botData.id,
              siteId: botData.siteId,
              name: botData.name,
              userId: session.user.id // We know this is the correct user since we filtered by userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    } else {
      // If no botId provided, try to get the first bot for the user
      try {
        const bots: any[] = await db.$queryRaw`
          SELECT b.id, b."siteId", b.name, s."userId"
          FROM bots b
          JOIN sites s ON b."siteId" = s.id
          WHERE s."userId" = ${session.user.id}
          LIMIT 1
        `;
        
        if (bots.length > 0) {
          bot = bots[0];
        }
      } catch (dbError: any) {
        console.warn("Database connection failed, falling back to REST API:", dbError.message);
        useRestApi = true;
        
        // Fallback to REST API
        try {
          const { data: sites, error: siteError } = await supabaseRestClient
            .from('sites')
            .select('id, userId, bots(id, siteId, name)')
            .eq('userId', session.user.id)
            .limit(1)
            .single();
          
          if (!siteError && sites && sites.bots && sites.bots.length > 0) {
            bot = {
              id: sites.bots[0].id,
              siteId: sites.bots[0].siteId,
              name: sites.bots[0].name,
              userId: sites.userId
            };
          }
        } catch (restError: any) {
          console.error("REST API fallback also failed:", restError);
        }
      }
    }

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found. Please create a bot first." },
        { status: 404 },
      );
    }

    // Check if document belongs to user's bot (using raw query with REST API fallback)
    let document: any = null;
    try {
      const documents: any[] = await db.$queryRaw`
        SELECT id, "botId", "storagePath"
        FROM documents
        WHERE id = ${documentId} AND "botId" = ${bot.id}
        LIMIT 1
      `;
      
      if (documents.length > 0) {
        document = documents[0];
      }
    } catch (dbError: any) {
      if (useRestApi) {
        // Try REST API for document lookup
        try {
          const { data: docData, error: docError } = await supabaseRestClient
            .from('documents')
            .select('id, botId, storagePath')
            .eq('id', documentId)
            .eq('botId', bot.id)
            .limit(1)
            .single();
          
          if (!docError && docData) {
            document = docData;
          }
        } catch (restError: any) {
          console.error("REST API document lookup also failed:", restError);
        }
      } else {
        console.error("Failed to lookup document:", dbError);
      }
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete associated vectors/embeddings (with REST API fallback)
    try {
      if (!useRestApi) {
        await db.$executeRaw`
          DELETE FROM vectors 
          WHERE "botId" = ${bot.id} 
          AND "documentId" = ${documentId}
        `;
      } else {
        // Use REST API for vector deletion
        await supabaseRestClient
          .from('vectors')
          .delete()
          .eq('botId', bot.id)
          .eq('documentId', documentId);
      }
    } catch (vectorDeleteError: any) {
      console.warn("Failed to delete document vectors:", vectorDeleteError);
      // This is not critical, so we continue
    }

    // Delete document from storage if it exists
    if (document.storagePath) {
      try {
        await supabaseAdmin.storage
          .from("documents")
          .remove([document.storagePath]);
      } catch (storageError) {
        console.warn("Failed to delete document from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete document record (using raw query with REST API fallback)
    try {
      if (!useRestApi) {
        await db.$executeRaw`
          DELETE FROM documents
          WHERE id = ${documentId}
        `;
      } else {
        // Use REST API for document deletion
        await supabaseRestClient
          .from('documents')
          .delete()
          .eq('id', documentId);
      }
    } catch (deleteError: any) {
      if (useRestApi) {
        // Try REST API for document deletion
        try {
          await supabaseRestClient
            .from('documents')
            .delete()
            .eq('id', documentId);
        } catch (restDeleteError: any) {
          console.error("REST API document deletion also failed:", restDeleteError);
          return NextResponse.json(
            { error: "Failed to delete document" },
            { status: 500 },
          );
        }
      } else {
        console.error("Failed to delete document:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete document" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Document deletion error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}