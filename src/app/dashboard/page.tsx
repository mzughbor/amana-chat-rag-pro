import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/lib/db";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  // Get user's site
  const site = await db.site.findFirst({
    where: { userId: session.user.id },
  });

  // Get stats (only if site exists)
  let docCount = 0;
  let qaCount = 0;
  let convCount = 0;

  if (site) {
    try {
      [docCount, qaCount, convCount] = await Promise.all([
        db.document.count({ where: { siteId: site.id } }).catch(() => 0),
        db.qAPair.count({ where: { siteId: site.id } }).catch(() => 0),
        db.conversation.count({ where: { siteId: site.id } }).catch(() => 0),
      ]);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Use default values of 0 if there's an error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">AmanaRAG</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{session.user.email}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-primary hover:text-primary/80"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back! Manage your chatbot and content.
          </p>
        </div>

        {!site && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              You need to set up your site first. Please configure your API key
              and site settings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Documents</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {docCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Q&A Pairs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {qaCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Conversations
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {convCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/upload"
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Content
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Upload PDFs or add Q&A pairs
            </p>
          </Link>

          <Link
            href="/api-key"
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              API Key Setup
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Configure your OpenAI API key
            </p>
          </Link>

          <Link
            href="/logs"
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900">Chat Logs</h3>
            <p className="mt-2 text-sm text-gray-600">
              View conversation history
            </p>
          </Link>

          <Link
            href="/widget"
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900">Widget Setup</h3>
            <p className="mt-2 text-sm text-gray-600">
              Get your embed code
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

