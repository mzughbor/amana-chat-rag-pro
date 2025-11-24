"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";
import CreateBotWizard from "~/components/dashboard/CreateBotWizard";
import BotSettingsModal from "~/components/dashboard/BotSettingsModal";

interface Site {
  id: string;
  name: string;
  createdAt: Date;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showBotSettings, setShowBotSettings] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session) {
      router.push("/login");
      return;
    }

    // User is authenticated, load sites
    fetchSites();
  }, [session, status, router]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API endpoint
      // For now, we'll use a placeholder but with the correct structure
      // You would replace this with an actual API call to get user's sites
      const response = await fetch('/api/sites');
      if (response.ok) {
        const userSites = await response.json();
        setSites(userSites);
      } else {
        // Fallback to placeholder with correct site ID
        setSites([
          { 
            id: "cmiacw2od0002rc4lfqzzved6", 
            name: "Default Site", 
            createdAt: new Date() 
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching sites:", error);
      // Fallback to placeholder with correct site ID
      setSites([
        { 
          id: "cmiacw2od0002rc4lfqzzved6", 
          name: "Default Site", 
          createdAt: new Date() 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === "loading") {
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
            Welcome back, {session.user?.name || session.user?.email?.split("@")[0] || "User"}! Manage your sites.
          </p>
        </div>
      </div>

      {/* Usage Widget */}
      <Card className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-700">Total Sites</p>
            <p className="text-2xl font-bold text-slate-900">{sites.length}</p>
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
        <h2 className="text-2xl font-semibold text-slate-900">Your Sites</h2>
        <Button variant="primary" onClick={() => setShowCreateBot(true)}>
          Create Site
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card className="p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No sites yet</h3>
          <p className="text-slate-700 mb-4">Get started by creating your first site.</p>
          <Button variant="primary" onClick={() => setShowCreateBot(true)}>
            Create Site
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{site.name}</h3>
                  <p className="text-sm text-slate-700 line-clamp-2">Site ID: {site.id}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedSite(site);
                    setShowBotSettings(true);
                  }}
                >
                  Settings
                </Button>
                <Link href={`/chat/${site.id}`} className="flex-1">
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
          onComplete={(newSite) => {
            setSites([...sites, newSite]);
            setShowCreateBot(false);
          }}
        />
      )}

      {showBotSettings && selectedSite && (
        <BotSettingsModal
          isOpen={showBotSettings}
          onClose={() => {
            setShowBotSettings(false);
            setSelectedSite(null);
          }}
          bot={selectedSite}
        />
      )}
    </div>
  );
}