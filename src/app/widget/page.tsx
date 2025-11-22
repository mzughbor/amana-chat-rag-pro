import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import WidgetSetup from "~/components/widget/WidgetSetup";

export default async function WidgetPage() {
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

  return <WidgetSetup siteId={site.id} />;
}

