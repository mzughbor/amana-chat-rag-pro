import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import { getSiteByUserId } from "~/lib/supabaseRestClient";
import UploadContent from "~/components/upload/UploadContent";

export default async function UploadPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Try to get site from database first, fallback to REST API
  let siteData: any = null;
  let botId: string | null = null;
  
  try {
    console.log("Attempting to fetch site from database for user:", session.user.id);
    // Use raw query to avoid typing issues
    const sites: any[] = await db.$queryRaw`
      SELECT s.id, s."userId", s.name, b.id as "botId"
      FROM sites s
      LEFT JOIN bots b ON s.id = b."siteId"
      WHERE s."userId" = ${session.user.id}
      LIMIT 1
    `;
    
    if (sites.length > 0 && sites[0].botId) {
      siteData = sites[0];
      botId = sites[0].botId;
      console.log("Successfully fetched site from database:", sites[0].id);
    }
  } catch (dbError: any) {
    // If database connection fails, fallback to REST API
    console.warn("Database connection failed, falling back to REST API:", dbError.message);
    
    try {
      console.log("Attempting to fetch site via REST API for user:", session.user.id);
      const site = await getSiteByUserId(session.user.id);
      
      if (site) {
        siteData = site;
        // For REST API, the bot is nested in the response as 'bots' (plural)
        // Handle both object and array cases generically
        const botData = (site as any).bots;
        if (Array.isArray(botData) && botData.length > 0) {
          botId = botData[0].id || null;
        } else if (botData && typeof botData === 'object' && botData.id) {
          botId = botData.id || null;
        }
        console.log("Successfully fetched site via REST API:", site.id);
      }
    } catch (restError: any) {
      console.error("REST API fallback also failed:", restError);
      throw new Error(`Failed to fetch site: ${restError.message || restError}`);
    }
  }

  if (!siteData || !botId) {
    console.log("No site or bot found, redirecting to dashboard");
    redirect("/dashboard");
  }

  // Fetch documents - use raw SQL to handle both old and new schema
  let documents: any[] = [];
  try {
    // Try new schema first (botId, fileName, ingestionStatus)
    const newDocs = await db.$queryRaw<any[]>`
      SELECT 
        id,
        COALESCE("fileName", filename) as filename,
        COALESCE("ingestionStatus", status) as status,
        "errorMessage",
        "createdAt"
      FROM documents
      WHERE "botId" = ${botId}
      ORDER BY "createdAt" DESC
    `;
    documents = newDocs;
  } catch (error: any) {
    // Fallback to old schema (siteId, filename, status)
    try {
      const oldDocs = await db.$queryRaw<any[]>`
        SELECT 
          id,
          filename,
          status,
          "errorMessage",
          "createdAt"
        FROM documents
        WHERE "siteId" = ${siteData.id}
        ORDER BY "createdAt" DESC
      `;
      documents = oldDocs;
    } catch (fallbackError) {
      console.error("Error fetching documents:", fallbackError);
      documents = [];
    }
  }

  // Transform to match expected interface
  documents = documents.map((doc: any) => ({
    id: doc.id,
    filename: doc.filename || "Unknown",
    status: doc.status || "unknown",
    errorMessage: doc.errorMessage || null,
    createdAt: doc.createdAt,
  }));

  // Fetch QAPairs - use raw SQL to handle both old and new schema
  let qaPairs: any[] = [];
  try {
    // Try new schema first (botId)
    const newQAs = await db.$queryRaw<any[]>`
      SELECT id, question, answer, "createdAt"
      FROM qa_pairs
      WHERE "botId" = ${botId}
      ORDER BY "createdAt" DESC
    `;
    qaPairs = newQAs;
  } catch (error: any) {
    // Fallback to old schema (siteId)
    try {
      const oldQAs = await db.$queryRaw<any[]>`
        SELECT id, question, answer, "createdAt"
        FROM qa_pairs
        WHERE "siteId" = ${siteData.id}
        ORDER BY "createdAt" DESC
      `;
      qaPairs = oldQAs;
    } catch (fallbackError) {
      console.error("Error fetching QAPairs:", fallbackError);
      qaPairs = [];
    }
  }

  return <UploadContent botId={botId} documents={documents} qaPairs={qaPairs} />;
}