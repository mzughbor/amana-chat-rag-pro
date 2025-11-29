import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import { getSiteByUserId } from "~/lib/supabaseRestClient";
import UploadContent from "~/features/upload/components/UploadContent";

interface UploadPageProps {
  searchParams: { botId?: string };
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Try to get sites with bots from database first, fallback to REST API
  let sitesData: any[] = [];
  let botsData: any[] = [];
  
  try {
    // Use raw query to get all sites and their bots for the user
    const sites: any[] = await db.$queryRaw`
      SELECT s.id as "siteId", s.name as "siteName", s."userId", b.id as "botId", b.name as "botName"
      FROM sites s
      LEFT JOIN bots b ON s.id = b."siteId"
      WHERE s."userId" = ${session.user.id}
      ORDER BY s."createdAt" DESC
    `;
    
    
    // Group by site
    const sitesMap: Record<string, any> = {};
    sites.forEach(site => {
      if (!sitesMap[site.siteId]) {
        sitesMap[site.siteId] = {
          id: site.siteId,
          name: site.siteName,
          userId: site.userId,
          bots: []
        };
      }
      if (site.botId) {
        sitesMap[site.siteId].bots.push({
          id: site.botId,
          name: site.botName,
          siteId: site.siteId
        });
      }
    });
    
    sitesData = Object.values(sitesMap);
    
    // Flatten bots for easy selection
    botsData = sites.flatMap(site => 
      site.botId ? [{
        id: site.botId,
        name: site.botName || `${site.siteName} Bot`,
        siteId: site.siteId
      }] : []
    );
    
  } catch (dbError: any) {
    // If database connection fails, fallback to REST API
    console.warn("Database connection failed, falling back to REST API:", dbError.message);
    
    try {
      // For REST API, we need to make separate calls or use the existing function
      // Let's try to get sites with bots using the existing function and adapt
      const site = await getSiteByUserId(session.user.id);
      
      
      if (site) {
        sitesData = [{
          id: site.id,
          name: site.name,
          userId: site.userId,
          bots: Array.isArray(site.bots) ? site.bots : (site.bots ? [site.bots] : [])
        }];
        
        // Flatten bots for easy selection
        botsData = sitesData[0].bots.map((bot: any) => ({
          id: bot.id,
          name: bot.name || `${site.name} Bot`,
          siteId: site.id
        }));
        
      }
    } catch (restError: any) {
      console.error("REST API fallback also failed:", restError);
      // Don't throw error, just continue with empty arrays
      sitesData = [];
      botsData = [];
    }
  }

  // If no bots exist, redirect to dashboard to create one
  if (botsData.length === 0) {
    redirect("/dashboard");
  }

  // Use botId from query params if provided, otherwise use the first bot
  let defaultBotId = botsData[0].id;
  if (searchParams.botId) {
    // Validate that the botId exists and belongs to the user
    const requestedBot = botsData.find(bot => bot.id === searchParams.botId);
    if (requestedBot) {
      defaultBotId = searchParams.botId;
    } else {
      console.warn(`Bot ID ${searchParams.botId} not found or doesn't belong to user, using default bot`);
    }
  }
  
  // Fetch documents for the default bot - use raw SQL to handle both old and new schema
  let documents: any[] = [];
  try {
    // Try new schema first (botId, fileName, ingestionStatus)
    const newDocs = await db.$queryRaw<any[]>`
      SELECT 
        id,
        "fileName" as filename,
        "ingestionStatus" as status,
        "errorMessage",
        "createdAt"
      FROM documents
      WHERE "botId" = ${defaultBotId}
      ORDER BY "createdAt" DESC
    `;
    documents = newDocs;
  } catch (error: any) {
    console.warn("New schema query failed, trying fallback:", error.message);
    // Fallback: try with COALESCE for backward compatibility
    try {
      const fallbackDocs = await db.$queryRaw<any[]>`
        SELECT 
          id,
          COALESCE("fileName", filename) as filename,
          COALESCE("ingestionStatus", status) as status,
          "errorMessage",
          "createdAt"
        FROM documents
        WHERE "botId" = ${defaultBotId} OR "siteId" = (SELECT "siteId" FROM bots WHERE id = ${defaultBotId} LIMIT 1)
        ORDER BY "createdAt" DESC
      `;
      documents = fallbackDocs;
    } catch (fallbackError: any) {
      console.error("Error fetching documents:", fallbackError);
      // Last resort: return empty array
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

  // Fetch QAPairs for the default bot - use raw SQL to handle both old and new schema
  let qaPairs: any[] = [];
  try {
    // Try new schema first (botId)
    const newQAs = await db.$queryRaw<any[]>`
      SELECT id, question, answer, "createdAt"
      FROM qa_pairs
      WHERE "botId" = ${defaultBotId}
      ORDER BY "createdAt" DESC
    `;
    qaPairs = newQAs;
  } catch (error: any) {
    // Fallback to old schema (siteId)
    try {
      const siteId = botsData[0].siteId;
      const oldQAs = await db.$queryRaw<any[]>`
        SELECT id, question, answer, "createdAt"
        FROM qa_pairs
        WHERE "siteId" = ${siteId}
        ORDER BY "createdAt" DESC
      `;
      qaPairs = oldQAs;
    } catch (fallbackError) {
      console.error("Error fetching QAPairs:", fallbackError);
      qaPairs = [];
    }
  }

  return <UploadContent 
    botId={defaultBotId} 
    documents={documents} 
    qaPairs={qaPairs} 
    sites={sitesData}
    bots={botsData}
  />;
}