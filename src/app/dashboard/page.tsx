"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";
import CreateBotWizard from "~/components/dashboard/CreateBotWizard";
import BotSettingsModal from "~/components/dashboard/BotSettingsModal";

interface Bot {
  id: string;
  name: string;
  welcomeMessage: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState<Bot[]>([]);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showBotSettings, setShowBotSettings] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchUserSites();
    }
  }, [status, session, router]);

  const fetchUserSites = async () => {
    try {
      setLoading(true);
      // Fetch actual sites from the API
      const response = await fetch("/api/sites", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sites");
      }

      const userSites = await response.json();

      // Transform sites to bots format
      const transformedBots = userSites.map((site: any) => ({
        id: site.id,
        name: site.name,
        welcomeMessage: "Hello! How can I help you today?",
        createdAt: site.createdAt,
      }));

      setBots(transformedBots);
    } catch (error) {
      console.error("Error fetching user sites:", error);
      // Fallback to empty array if there's an error
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold text-slate-900 mb-3">Dashboard</h1>
          <p className="text-xl text-slate-700">
            Welcome back, {session.user?.name || session.user?.email?.split("@")[0] || "User"}! Manage your bots.
          </p>
        </div>
      </div>

      {/* Usage Widget */}
      <Card className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-700">Total Bots</p>
            <p className="text-2xl font-bold text-slate-900">{bots.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-700">Messages This Month</p>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
          <div>
            <p className="text-sm text-slate-700">Documents Processed</p>
            <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
        </div>
      </Card>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Your Bots</h2>
        <Button variant="primary" onClick={() => setShowCreateBot(true)}>
          Create Bot
        </Button>
      </div>

      {bots.length === 0 ? (
        <Card className="p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No bots yet</h3>
          <p className="text-slate-700 mb-4">Get started by creating your first bot.</p>
          <Button variant="primary" onClick={() => setShowCreateBot(true)}>
            Create Bot
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{bot.name}</h3>
                  <p className="text-sm text-slate-700 line-clamp-2">Bot ID: {bot.id}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedBot(bot);
                    setShowBotSettings(true);
                  }}
                >
                  Settings
                </Button>
                <Link href={`/chat/${bot.id}`} className="flex-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    Chat
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreateBot && (
        <CreateBotWizard
          isOpen={showCreateBot}
          onClose={() => setShowCreateBot(false)}
          onComplete={(newBot) => {
            setBots([...bots, newBot]);
            setShowCreateBot(false);
          }}
        />
      )}

      {showBotSettings && selectedBot && (
        <BotSettingsModal
          isOpen={showBotSettings}
          onClose={() => {
            setShowBotSettings(false);
            setSelectedBot(null);
          }}
          bot={selectedBot}
        />
      )}
    </div>
  );
}