import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import { getSiteByUserId } from "~/lib/supabaseRestClient";
import UploadContent from "~/features/upload/components/UploadContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UploadPageProps {
  searchParams: { botId?: string };
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const session = await getServerAuthSession();

  // Log session state for debugging in production
  if (process.env.NODE_ENV === "production") {
    console.log(`[UploadPage] Session exists: ${!!session}, User ID: ${session?.user?.id || "none"}`);
  }

  if (!session?.user) {
    if (process.env.NODE_ENV === "production") {
      console.log(`[UploadPage] No session, redirecting to /login`);
    }
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

  // If no bots exist, allow user to stay on page but show empty state
  // The UploadContent component will handle showing a message or allowing bot creation
  let defaultBotId: string | null = null;
  
  if (botsData.length > 0) {
    // Use botId from query params if provided, otherwise use the first bot
    defaultBotId = botsData[0].id;
    
    if (searchParams.botId) {
      // Validate that the botId exists and belongs to the user
      const requestedBot = botsData.find(bot => bot.id === searchParams.botId);
      if (requestedBot) {
        defaultBotId = searchParams.botId;
      } else {
        console.warn(`Bot ID ${searchParams.botId} not found or doesn't belong to user, using default bot`);
        defaultBotId = botsData[0]?.id || null;
      }
    }
  }
  
  // Fetch documents for the default bot - use raw SQL to handle both old and new schema
  let documents: any[] = [];
  
  if (defaultBotId) {
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
  }

  // Transform to match expected interface
  // Convert createdAt to ISO string to avoid hydration mismatch
  documents = documents.map((doc: any) => ({
    id: doc.id,
    filename: doc.filename || "Unknown",
    status: doc.status || "unknown",
    errorMessage: doc.errorMessage || null,
    createdAt: doc.createdAt instanceof Date 
      ? doc.createdAt.toISOString() 
      : typeof doc.createdAt === 'string' 
        ? doc.createdAt 
        : new Date(doc.createdAt).toISOString(),
  }));

  // Fetch QAPairs for the default bot - use raw SQL to handle both old and new schema
  let qaPairs: any[] = [];
  
  if (defaultBotId) {
    try {
      // Try new schema first (botId)
      const newQAs = await db.$queryRaw<any[]>`
        SELECT id, question, answer, "createdAt"
        FROM qa_pairs
        WHERE "botId" = ${defaultBotId}
        ORDER BY "createdAt" DESC
      `;
      // Convert createdAt to ISO string to avoid hydration mismatch
      qaPairs = newQAs.map((qa: any) => ({
        ...qa,
        createdAt: qa.createdAt instanceof Date 
          ? qa.createdAt.toISOString() 
          : typeof qa.createdAt === 'string' 
            ? qa.createdAt 
            : new Date(qa.createdAt).toISOString(),
      }));
    } catch (error: any) {
      // Fallback to old schema (siteId)
      try {
        const siteId = botsData[0]?.siteId;
        if (siteId) {
          const oldQAs = await db.$queryRaw<any[]>`
            SELECT id, question, answer, "createdAt"
            FROM qa_pairs
            WHERE "siteId" = ${siteId}
            ORDER BY "createdAt" DESC
          `;
          // Convert createdAt to ISO string to avoid hydration mismatch
          qaPairs = oldQAs.map((qa: any) => ({
            ...qa,
            createdAt: qa.createdAt instanceof Date 
              ? qa.createdAt.toISOString() 
              : typeof qa.createdAt === 'string' 
                ? qa.createdAt 
                : new Date(qa.createdAt).toISOString(),
          }));
        }
      } catch (fallbackError) {
        console.error("Error fetching QAPairs:", fallbackError);
        qaPairs = [];
      }
    }
  }

  return <UploadContent 
    botId={defaultBotId || undefined} 
    documents={documents} 
    qaPairs={qaPairs} 
    sites={sitesData}
    bots={botsData}
  />;
}