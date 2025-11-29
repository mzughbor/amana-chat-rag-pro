import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import WidgetSetup from "~/features/widget/components/WidgetSetup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WidgetPage() {
  const session = await getServerAuthSession();

  // Log session state for debugging in production
  if (process.env.NODE_ENV === "production") {
    console.log(`[WidgetPage] Session exists: ${!!session}, User ID: ${session?.user?.id || "none"}`);
  }

  if (!session?.user) {
    if (process.env.NODE_ENV === "production") {
      console.log(`[WidgetPage] No session, redirecting to /login`);
    }
    redirect("/login");
  }

  // WidgetSetup component will handle fetching bots and selection
  return <WidgetSetup />;
}