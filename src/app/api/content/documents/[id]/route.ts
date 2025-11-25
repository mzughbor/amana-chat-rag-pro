import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSessionFromRequest } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseAdmin } from "~/lib/supabase";

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

    // Get user's site
    const site = await db.site.findFirst({
      where: { userId: session.user.id },
    });

    if (!site) {
      return NextResponse.json(
        { error: "Site not found. Please set up your site first." },
        { status: 404 },
      );
    }

    // Check if document belongs to user's site
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        siteId: site.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete associated vectors/embeddings
    await db.$executeRaw`
      DELETE FROM vectors 
      WHERE "siteId" = ${site.id} 
      AND "docId" = ${documentId}
    `;

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

    // Delete document record
    await db.document.delete({
      where: { id: documentId },
    });

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