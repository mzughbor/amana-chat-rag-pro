"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";

interface Bot {
  id: string;
  name: string;
  siteId: string;
  widgetSettings?: {
    primaryColor?: string;
    cornerRadius?: string;
  };
  site?: {
    name: string;
    domain?: string;
  };
}

export default function WidgetSetup() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Widget customization settings
  const [primaryColor, setPrimaryColor] = useState("#6B46C1");
  const [cornerRadius, setCornerRadius] = useState("50%");
  
  // Get selected bot
  const selectedBot = bots.find(bot => bot.id === selectedBotId);

  // Fetch bots on mount
  useEffect(() => {
    fetchBots();
  }, []);

  // Load widget settings when bot is selected
  useEffect(() => {
    if (selectedBotId) {
      loadWidgetSettings(selectedBotId);
    }
  }, [selectedBotId]);

  const fetchBots = async () => {
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
  };

  const loadWidgetSettings = async (botId: string) => {
    try {
      const response = await fetch(`/api/bots/${botId}/widget-settings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const settings = data.widgetSettings || {};
        
        if (settings.primaryColor) {
          setPrimaryColor(settings.primaryColor);
        }
        if (settings.cornerRadius) {
          setCornerRadius(settings.cornerRadius);
        }
      }
    } catch (error) {
      console.error("Error loading widget settings:", error);
    }
  };

  const saveWidgetSettings = async () => {
    if (!selectedBotId) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/bots/${selectedBotId}/widget-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          widgetSettings: {
            primaryColor,
            cornerRadius,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save widget settings");
      }

      // Show success feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error saving widget settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Generate widget script with current settings
  const widgetScript = useMemo(() => {
    if (!selectedBotId) return "";
    
    const widgetUrl = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      siteId: selectedBotId,
      color: primaryColor.replace("#", ""),
      radius: cornerRadius,
    });
    
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${widgetUrl}/widget.js?${params.toString()}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  }, [selectedBotId, primaryColor, cornerRadius]);

  const copyToClipboard = () => {
    if (!widgetScript) return;
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Customize Widget</h2>
            
            <div className="space-y-6">
              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Button Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="#6B46C1"
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

              <Button
                onClick={saveWidgetSettings}
                variant="primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
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
            <div className="relative border-2 border-gray-200 rounded-lg p-8 bg-gray-50 min-h-[400px]">
              {/* Simulated website content */}
              <div className="mb-4">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
              
              {/* Widget Preview */}
              <div className="absolute bottom-4 right-4">
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    backgroundColor: primaryColor,
                    borderRadius: cornerRadius,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

