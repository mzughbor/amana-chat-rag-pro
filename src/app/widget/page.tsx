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
  let site;
  try {
    site = await db.site.findFirst({
      where: { userId: session.user.id },
      include: { bot: true },
    });
  } catch (dbError: any) {
    // If database connection fails, fallback to REST API
    console.warn("Database connection failed, falling back to REST API:", dbError.message);
    
    try {
      site = await getSiteByUserId(session.user.id);
    } catch (restError: any) {
      console.error("REST API fallback also failed:", restError.message);
      throw restError;
    }
  }

  if (!site || !site.bot) {
    redirect("/dashboard");
  }

  return <WidgetSetup botId={site.bot.id} />;
}