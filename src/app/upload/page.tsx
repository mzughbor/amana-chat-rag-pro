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
  });

  if (!site) {
    redirect("/api-key");
  }

  const documents = await db.document.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
  });

  const qaPairs = await db.qaPair.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
  });

  return <UploadContent siteId={site.id} documents={documents} qaPairs={qaPairs} />;
}

