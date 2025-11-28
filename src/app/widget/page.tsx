import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import WidgetSetup from "~/components/widget/WidgetSetup";

export default async function WidgetPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  console.log("User authenticated, proceeding to widget setup for user:", session.user.id);

  // WidgetSetup component will handle fetching bots and selection
  return <WidgetSetup />;
}