import { notFound } from "next/navigation";
import Script from 'next/script';
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

export default async function WidgetChatPage({ params }: { params: { siteId: string } }) {
  // Validate contextId (can be either siteId or botId)
  if (!params.siteId) {
    notFound();
  }

  const { siteId: contextId } = params;

  // Validate that botId exists in database
  let botExists = false;
  try {
    // Try to find bot by ID first
    const bots: any[] = await db.$queryRaw`
      SELECT b.id
      FROM bots b
      WHERE b.id = ${contextId}
      LIMIT 1
    `;

    if (bots.length > 0) {
      botExists = true;
    } else {
      // Try finding by siteId
      const sites: any[] = await db.$queryRaw`
        SELECT s.id
        FROM sites s
        WHERE s.id = ${contextId}
        LIMIT 1
      `;
      botExists = sites.length > 0;
    }
  } catch (dbError: any) {
    console.warn("Database query failed, falling back to REST API:", dbError.message);
    try {
      const { data: botData, error: botError } = await supabaseRestClient
        .from("bots")
        .select("id")
        .eq("id", contextId)
        .limit(1)
        .single();

      if (!botError && botData) {
        botExists = true;
      } else {
        const { data: siteData, error: siteError } = await supabaseRestClient
          .from("sites")
          .select("id")
          .eq("id", contextId)
          .limit(1)
          .single();

        botExists = !siteError && !!siteData;
      }
    } catch (restError: any) {
      console.error("REST API fallback also failed:", restError.message);
    }
  }

  // If botId doesn't exist, return 404
  if (!botExists) {
    notFound();
  }

  // Return a completely static page that will be enhanced with client-side JavaScript
  return (
    <div id="amana-rag-widget-container" data-site-id={params.siteId} className="h-screen w-screen overflow-hidden bg-white">
      {/* This is a placeholder that will be replaced by client-side JavaScript */}
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
      <Script src="/widget-chat.js" strategy="afterInteractive" />
    </div>
  );
}