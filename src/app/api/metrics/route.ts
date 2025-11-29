import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { db } from "~/lib/db";
import { supabaseRestClient } from "~/lib/supabaseRestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

interface MetricsResponse {
  documents: number;
  messages: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const result: Array<{ documents_count: bigint | number | null; messages_count: bigint | number | null }> =
        await db.$queryRaw`
          SELECT
            COALESCE((
              SELECT COUNT(*)
              FROM documents d
              JOIN bots b ON d."botId" = b.id
              JOIN sites s ON b."siteId" = s.id
              WHERE s."userId" = ${session.user.id}
            ), 0) AS documents_count,
            COALESCE((
              SELECT COUNT(*)
              FROM messages m
              JOIN conversations c ON m."conversationId" = c.id
              JOIN bots b ON c."botId" = b.id
              JOIN sites s ON b."siteId" = s.id
              WHERE s."userId" = ${session.user.id}
            ), 0) AS messages_count
        `;

      const documents = Number(result[0]?.documents_count ?? 0);
      const messages = Number(result[0]?.messages_count ?? 0);

      return NextResponse.json<MetricsResponse>({ documents, messages });
    } catch (dbError) {
      console.warn("Database connection failed when fetching metrics, falling back to REST API:", (dbError as Error).message);

      if (!supabaseRestClient) {
        return NextResponse.json<MetricsResponse>({ documents: 0, messages: 0 });
      }

      // Fetch sites with bots via REST to derive bot IDs owned by the user
      const { data: sites, error: sitesError } = await supabaseRestClient
        .from("sites")
        .select("id, bots(id)")
        .eq("userId", session.user.id);

      if (sitesError) {
        console.error("REST fallback failed while fetching sites for metrics:", sitesError.message);
        return NextResponse.json<MetricsResponse>({ documents: 0, messages: 0 });
      }

      const botIds = sites
        .map((site: any) => {
          const siteBots = Array.isArray(site.bots) ? site.bots : site.bots ? [site.bots] : [];
          return siteBots.map((bot: any) => bot.id);
        })
        .flat()
        .filter(Boolean);

      if (botIds.length === 0) {
        return NextResponse.json<MetricsResponse>({ documents: 0, messages: 0 });
      }

      const { count: documentsCount } = await supabaseRestClient
        .from("documents")
        .select("id", { count: "exact", head: true })
        .in("botId", botIds);

      // Count messages by joining conversations -> bots via REST
      const { data: conversations, error: convoError } = await supabaseRestClient
        .from("conversations")
        .select("id")
        .in("botId", botIds);

      if (convoError) {
        console.error("REST fallback failed while fetching conversations:", convoError.message);
        return NextResponse.json<MetricsResponse>({ documents: documentsCount ?? 0, messages: 0 });
      }

      const conversationIds = conversations?.map((convo: any) => convo.id) ?? [];

      if (conversationIds.length === 0) {
        return NextResponse.json<MetricsResponse>({ documents: documentsCount ?? 0, messages: 0 });
      }

      const { count: messagesCount } = await supabaseRestClient
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversationId", conversationIds);

      return NextResponse.json<MetricsResponse>({
        documents: documentsCount ?? 0,
        messages: messagesCount ?? 0,
      });
    }
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}

