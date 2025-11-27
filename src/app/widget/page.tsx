import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import WidgetSetup from "~/components/widget/WidgetSetup";

export default async function WidgetPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // WidgetSetup component will handle fetching bots and selection
  return <WidgetSetup />;
}