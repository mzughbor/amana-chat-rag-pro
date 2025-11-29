"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "~/components/common/Card";
import Button from "~/components/common/Button";
import Modal from "~/components/common/Modal";
import Toast from "~/components/common/Toast";
import CreateBotWizard from "~/features/dashboard/components/CreateBotWizard";
import BotSettingsModal from "~/features/dashboard/components/BotSettingsModal";

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
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdBot, setCreatedBot] = useState<Bot | null>(null);
  const [metrics, setMetrics] = useState({ documents: 0, messages: 0 });
  const [metricsLoading, setMetricsLoading] = useState(true);

  const fetchUserSites = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bots", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch bots: ${response.status} ${response.statusText}`);
      }

      const botsData = await response.json();

      const botsArray = Array.isArray(botsData) ? botsData : [];

      const transformedBots = botsArray
        .filter((bot: any) => bot && bot.id)
        .map((bot: any) => ({
          id: bot.id,
          name: bot.name || "Unnamed Bot",
          welcomeMessage: bot.welcomeMessage || "Hello! How can I help you today?",
          createdAt: bot.createdAt || new Date().toISOString(),
        }));

      setBots(transformedBots);
    } catch (error) {
      console.error("Error fetching bots:", error);
      setBots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch("/api/metrics");
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      const data = await response.json();
      setMetrics({
        documents: data.documents ?? 0,
        messages: data.messages ?? 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setMetrics({ documents: 0, messages: 0 });
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchUserSites();
      fetchMetrics();
    }
  }, [status, router, fetchUserSites, fetchMetrics]);

  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/bots/${botToDelete.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete bot: ${response.status} ${response.statusText}`);
      }
      
      // Remove bot from list
      setBots(bots.filter(bot => bot.id !== botToDelete.id));
      setBotToDelete(null);
      setShowDeleteConfirm(false);
      
      // Show success toast
      setToastMessage("Bot deleted successfully");
      setToastType("success");
      setToastVisible(true);
    } catch (error) {
      console.error("Error deleting bot:", error);
      setToastMessage("Failed to delete bot. Please try again.");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteClick = (bot: Bot) => {
    setBotToDelete(bot);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!botToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/bots/${botToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete bot: ${response.status}`);
      }

      // Remove bot from list
      setBots(bots.filter((b) => b.id !== botToDelete.id));
      setShowDeleteConfirm(false);
      setBotToDelete(null);
      setToastMessage(`Bot &quot;${botToDelete.name}&quot; deleted successfully`);
      setToastType("success");
      setToastVisible(true);
    } catch (error) {
      console.error("Error deleting bot:", error);
      setToastMessage(error instanceof Error ? error.message : "Failed to delete bot. Please try again.");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setBotToDelete(null);
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
            <p className="text-2xl font-bold text-slate-900">
              {metricsLoading ? "..." : metrics.messages.toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-700">Documents Processed</p>
            <p className="text-2xl font-bold text-slate-900">
              {metricsLoading ? "..." : metrics.documents.toLocaleString("en-US")}
            </p>
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
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bots.map((bot) => (
              <Card key={bot.id} hover>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{bot.name}</h3>
                    <p className="text-sm text-slate-600 mb-1 line-clamp-2">{bot.welcomeMessage}</p>
                    <p className="text-xs text-slate-500 mt-2">ID: {bot.id.substring(0, 8)}...</p>
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
                    Edit Bot Settings
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
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteClick(bot)}
                    disabled={deleting}
                  >
                    {deleting && botToDelete?.id === bot.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </span>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 text-xs text-gray-500">
              Showing {bots.length} bot{bots.length !== 1 ? "s" : ""}
            </div>
          )}
        </>
      )}

      {showCreateBot && (
        <CreateBotWizard
          isOpen={showCreateBot}
          onClose={() => setShowCreateBot(false)}
          onComplete={(newBot) => {
            // Add new bot to the list and refresh to get latest data
            setBots([...bots, newBot]);
            setCreatedBot(newBot);
            setShowSuccessModal(true);
            setShowCreateBot(false);
            // Optionally refresh the list to ensure consistency
            // fetchUserSites();
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
          onSettingsUpdated={fetchUserSites}
        />
      )}

      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setCreatedBot(null);
        }}
        title="Bot Created Successfully!"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {createdBot ? `Bot "${createdBot.name}" is ready!` : "Your bot is ready!"}
            </h3>
            <p className="text-base text-slate-600">
              Go to the upload page to add your files and Q&A content.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessModal(false);
                setCreatedBot(null);
              }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (createdBot?.id) {
                  router.push(`/upload?botId=${createdBot.id}`);
                } else {
                  router.push("/upload");
                }
                setShowSuccessModal(false);
                setCreatedBot(null);
              }}
            >
              Go to Upload Page
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        title="Delete Bot"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Are you sure you want to delete &quot;{botToDelete?.name}&quot;? This action cannot be undone and will permanently delete the bot and all associated data.

              </h3>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                "Delete Bot"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        duration={3000}
      />
    </div>
  );
}