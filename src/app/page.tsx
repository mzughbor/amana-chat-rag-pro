import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  // Simple check for next-auth session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("next-auth.session-token") || 
                       cookieStore.get("__Secure-next-auth.session-token");

  if (sessionToken) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

