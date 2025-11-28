"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";
import Modal from "~/components/ui/Modal";
import Toast from "~/components/ui/Toast";

interface Bot {
  id: string;
  name: string;
  siteId: string;
  widgetSettings?: Record<string, any>;
  site?: {
    name: string;
    domain?: string;
  };
}

type WidgetPosition = "bottom-right" | "bottom-left";

interface TestMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function WidgetSetup() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [accentColor, setAccentColor] = useState("#6B46C1");
  const [cornerRadius, setCornerRadius] = useState("50%");
  const [position, setPosition] = useState<WidgetPosition>("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! How can I help you today?");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (testModalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [testMessages, testModalOpen]);
  
  // Get selected bot
  const selectedBot = bots.find(bot => bot.id === selectedBotId);

  // Load widget settings when bot is selected
  useEffect(() => {
    if (selectedBotId) {
      loadWidgetSettings(selectedBotId);
    }
  }, [selectedBotId]);

  const fetchBots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bots", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bots: ${response.status}`);
      }

      const botsData = await response.json();
      const botsArray = Array.isArray(botsData) ? botsData : [];
      
      setBots(botsArray);
      
      // Auto-select first bot if available
      if (botsArray.length > 0 && !selectedBotId) {
        setSelectedBotId(botsArray[0].id);
      }
    } catch (error) {
      console.error("Error fetching bots:", error);
      setBots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBotId]);

  // Fetch bots on mount
  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const loadWidgetSettings = async (botId: string) => {
    setLoadingSettings(true);
    setSettingsError("");
    try {
      const response = await fetch(`/api/bots/${botId}/widget-settings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load widget settings (${response.status})`);
      }

      const data = await response.json();
      const settings = data.widgetSettings || {};

      setAccentColor(settings.accentColor || settings.primaryColor || "#6B46C1");
      setCornerRadius(settings.cornerRadius || "50%");
      setPosition((settings.position as WidgetPosition) || "bottom-right");
      setWelcomeMessage(settings.welcomeMessage || "Hello! How can I help you today?");
    } catch (error) {
      console.error("Error loading widget settings:", error);
      const message = error instanceof Error ? error.message : "Failed to load widget settings.";
      setSettingsError(message);
      setToastMessage(message);
      setToastType("error");
      setToastVisible(true);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveWidgetSettings = async () => {
    if (!selectedBotId) {
      setToastMessage("Please select a bot before saving settings.");
      setToastType("error");
      setToastVisible(true);
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`/api/bots/${selectedBotId}/widget-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          widgetSettings: {
            accentColor,
            cornerRadius,
            position,
            welcomeMessage,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save widget settings");
      }

      setToastMessage("Widget settings saved successfully!");
      setToastType("success");
      setToastVisible(true);
    } catch (error) {
      console.error("Error saving widget settings:", error);
      setToastMessage(
        error instanceof Error ? error.message : "Failed to save widget settings. Please try again.",
      );
      setToastType("error");
      setToastVisible(true);
    } finally {
      setSaving(false);
    }
  };

  // Generate widget script with current settings
  const widgetScript = useMemo(() => {
    if (!selectedBotId) return "";
    
    const widgetUrl = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      botId: selectedBotId,
      color: accentColor.replace("#", ""),
      radius: cornerRadius,
      position,
    });
    
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${widgetUrl}/widget.js?${params.toString()}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  }, [selectedBotId, accentColor, cornerRadius, position]);

  const copyToClipboard = () => {
    if (!widgetScript) return;
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTestWidget = () => {
    if (!selectedBotId) {
      setToastMessage("Please select a bot before testing the widget.");
      setToastType("error");
      setToastVisible(true);
      return;
    }

    const initialVisitorId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setVisitorId(initialVisitorId);
    setTestMessages([
      {
        role: "assistant",
        content: welcomeMessage || "Hello! How can I help you today?",
        timestamp: new Date(),
      },
    ]);
    setTestInput("");
    setTestError("");
    setTestModalOpen(true);
  };

  const closeTestWidget = () => {
    setTestModalOpen(false);
    setTestMessages([]);
    setTestInput("");
    setTestError("");
  };

  const sendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBotId || !testInput.trim() || testLoading) {
      return;
    }

    const userMessage: TestMessage = {
      role: "user",
      content: testInput.trim(),
      timestamp: new Date(),
    };

    setTestMessages((prev) => [...prev, userMessage]);
    const currentInput = testInput.trim();
    setTestInput("");
    setTestLoading(true);
    setTestError("");

    try {
      const response = await fetch(`/api/chat/${selectedBotId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          visitorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to send message (${response.status})`);
      }

      if (data.visitorId && data.visitorId !== visitorId) {
        setVisitorId(data.visitorId);
      }

      setTestMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "No response received.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Test widget message failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to send message. Please try again.";
      setTestError(message);
      setTestMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Loading bots...</p>
          </div>
        </div>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
        <Card className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Bots Found</h2>
          <p className="text-gray-600 mb-6">
            You need to create a bot first before setting up the widget.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 transition-colors group"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Widget Setup</h1>
        <p className="text-lg text-gray-600">
          Configure and embed your chatbot widget on any website
        </p>
      </div>

      {/* Bot Selection Dropdown */}
      <Card className="mb-6 animate-fade-in">
        <div className="space-y-2">
          <label htmlFor="bot-select" className="block text-sm font-medium text-gray-700">
            Select Bot:
          </label>
          <select
            id="bot-select"
            value={selectedBotId || ""}
            onChange={(e) => setSelectedBotId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
          >
            <option value="">-- Select a Bot --</option>
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name} {bot.site?.name ? `(${bot.site.name})` : ""}
              </option>
            ))}
          </select>
          {selectedBot && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: <span className="font-medium">{selectedBot.name}</span>
              {selectedBot.site?.name && (
                <span className="text-gray-500"> • {selectedBot.site.name}</span>
              )}
            </p>
          )}
        </div>
      </Card>

      {selectedBot && (
        <>
          {/* Widget Customization */}
          <Card className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Customize Widget</h2>
              {(saving || loadingSettings) && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {loadingSettings ? "Loading settings..." : "Saving settings..."}
                </div>
              )}
            </div>

            {settingsError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {settingsError}
              </div>
            )}

            <div className="space-y-6">
              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                    aria-label="Select accent color"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#6B46C1"
                    aria-label="Enter accent color in hex format"
                  />
                </div>
              </div>

              {/* Corner Radius */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Shape
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Square", value: "0px" },
                    { label: "Rounded", value: "8px" },
                    { label: "More Rounded", value: "16px" },
                    { label: "Circle", value: "50%" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCornerRadius(option.value)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        cornerRadius === option.value
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as WidgetPosition)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="Select widget position"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Hello! How can I help you today?"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={saveWidgetSettings}
                  variant="primary"
                  disabled={saving || loadingSettings}
                >
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  onClick={openTestWidget}
                  variant="secondary"
                  disabled={!selectedBotId}
                >
                  Test Widget
                </Button>
              </div>
            </div>
          </Card>

          {/* Embed Script */}
          <Card className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Embed Script
              </h2>
              <Button
                onClick={copyToClipboard}
                variant="primary"
                size="md"
                disabled={!widgetScript}
              >
                {copied ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  'Copy Script'
                )}
              </Button>
            </div>

            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
              <code>{widgetScript || "Select a bot to generate embed code"}</code>
            </pre>

            <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h3 className="text-sm font-medium text-blue-900">
                Installation Instructions
              </h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-blue-800">
                <li>Copy the script above</li>
                <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
                <li>The chatbot widget will appear in the bottom-right corner</li>
                <li>Visitors can click it to start chatting</li>
              </ol>
            </div>
          </Card>

          {/* Live Preview */}
          <Card className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h2>
            <p className="text-sm text-gray-600 mb-4">
              See how your widget will look on your website
            </p>
            <div className="relative border-2 border-gray-200 rounded-lg p-8 min-h-[400px] bg-gray-50">
              {/* Simulated website content */}
              <div className="mb-4">
                <div className="h-4 rounded w-3/4 mb-2 bg-gray-300"></div>
                <div className="h-4 rounded w-1/2 bg-gray-300"></div>
              </div>
              
              {/* Widget Preview */}
              <div
                className={`absolute bottom-4 ${position === "bottom-right" ? "right-4" : "left-4"}`}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    backgroundColor: accentColor,
                    borderRadius: cornerRadius,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9 8s9 3.582 9 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Test Widget Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={closeTestWidget}
        title="Test Widget"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white border-gray-200 overflow-hidden">
            <div
              className="px-4 py-3 text-white flex items-center justify-between"
              style={{ background: accentColor }}
            >
              <div>
                <p className="text-sm uppercase tracking-wide opacity-80">Preview</p>
                <p className="text-lg font-semibold">Chat with {selectedBot?.name}</p>
              </div>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {testMessages.map((msg, idx) => (
                <div key={`${msg.timestamp.getTime()}-${idx}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow ${
                      msg.role === "user"
                        ? "text-white"
                        : "bg-white text-gray-900"
                    }`}
                    style={msg.role === "user" ? { background: accentColor } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="text-sm text-gray-500 animate-pulse">Thinking...</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {testError && (
              <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
                {testError}
              </div>
            )}

            <form onSubmit={sendTestMessage} className="border-t border-gray-200 p-3 flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={testLoading || !testInput.trim()}
                style={{ background: accentColor }}
                className="text-white"
              >
                {testLoading ? "Sending..." : "Send"}
              </Button>
            </form>
          </div>
        </div>
      </Modal>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}

