import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import { getSiteByUserId } from "~/lib/supabaseRestClient";
import WidgetSetup from "~/components/widget/WidgetSetup";

export default async function WidgetPage() {
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
        // For REST API, the bot is nested in the response
        // Handle both object and array cases generically
        const botData = (site as any).bot;
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

  return <WidgetSetup botId={botId} />;
}