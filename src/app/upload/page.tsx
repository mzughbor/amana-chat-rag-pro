import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import UploadContent from "~/components/upload/UploadContent";

export default async function UploadPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const site = await db.site.findFirst({
    where: { userId: session.user.id },
    include: { bot: true },
  });

  if (!site || !site.bot) {
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
      WHERE "botId" = ${site.bot.id}
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
        WHERE "siteId" = ${site.id}
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
      WHERE "botId" = ${site.bot.id}
      ORDER BY "createdAt" DESC
    `;
    qaPairs = newQAs;
  } catch (error: any) {
    // Fallback to old schema (siteId)
    try {
      const oldQAs = await db.$queryRaw<any[]>`
        SELECT id, question, answer, "createdAt"
        FROM qa_pairs
        WHERE "siteId" = ${site.id}
        ORDER BY "createdAt" DESC
      `;
      qaPairs = oldQAs;
    } catch (fallbackError) {
      console.error("Error fetching QAPairs:", fallbackError);
      qaPairs = [];
    }
  }

  return <UploadContent botId={site.bot.id} documents={documents} qaPairs={qaPairs} />;
}

