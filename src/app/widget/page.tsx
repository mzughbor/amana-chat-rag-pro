import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import WidgetSetup from "~/features/widget/components/WidgetSetup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WidgetPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // WidgetSetup component will handle fetching bots and selection
  return <WidgetSetup />;
}