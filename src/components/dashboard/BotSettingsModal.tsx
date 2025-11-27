"use client";

import { useState, useEffect } from "react";
import Modal from "~/components/ui/Modal";
import Button from "~/components/ui/Button";
import Toast from "~/components/ui/Toast";

interface Bot {
  id: string;
  name: string;
  welcomeMessage: string;
  createdAt: string;
}

interface BotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: Bot;
  onSettingsUpdated?: () => void;
}

export default function BotSettingsModal({
  isOpen,
  onClose,
  bot,
  onSettingsUpdated,
}: BotSettingsModalProps) {
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState(
    bot.welcomeMessage || "Hello! How can I help you today?",
  );
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Load existing widget settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWidgetSettings();
    }
  }, [isOpen, bot.id]);

  const loadWidgetSettings = async () => {
    setLoadingSettings(true);
    setError("");
    try {
      const response = await fetch(`/api/bots/${bot.id}/widget-settings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load settings (${response.status})`);
      }

      const data = await response.json();
      const settings = data.widgetSettings || {};

      setWelcomeMessage(
        typeof settings.welcomeMessage === "string" && settings.welcomeMessage.length > 0
          ? settings.welcomeMessage
          : bot.welcomeMessage || "Hello! How can I help you today?",
      );
      setApiKey(settings.apiKey || "");
    } catch (err) {
      console.error("Error loading bot settings:", err);
      const message = err instanceof Error ? err.message : "Failed to load bot settings.";
      setError(message);
      setToastMessage(message);
      setToastType("error");
      setToastVisible(true);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveBotSettings = async () => {
    setSaving(true);
    setError("");
    try {
      const widgetSettingsPayload = {
        widgetSettings: {
          welcomeMessage,
          ...(apiKey ? { apiKey } : {}),
        },
      };

      const widgetResponse = await fetch(`/api/bots/${bot.id}/widget-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(widgetSettingsPayload),
      });

      if (!widgetResponse.ok) {
        const errorData = await widgetResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save widget settings.");
      }

      const botResponse = await fetch(`/api/bots/${bot.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ welcomeMessage }),
      });

      if (!botResponse.ok) {
        const errorData = await botResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update bot welcome message.");
      }

      setToastMessage("Bot settings updated successfully!");
      setToastType("success");
      setToastVisible(true);
      onSettingsUpdated?.();
      onClose();
    } catch (err) {
      console.error("Error saving bot settings:", err);
      const message = err instanceof Error ? err.message : "Failed to save bot settings.";
      setError(message);
      setToastMessage(message);
      setToastType("error");
      setToastVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${bot.name}`} size="lg">
      <div className="space-y-6">
        {loadingSettings && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            Loading bot settings...
          </div>
        )}
        {error && !loadingSettings && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Welcome Message */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Welcome Message
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Hello! How can I help you today?"
          />
          <p className="mt-1 text-xs text-gray-500">
            This message appears at the top of the chat and test widget preview.
          </p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Bot API Key (BYOK)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <p className="mt-1 text-xs text-gray-500">
            We store your API key encrypted. Leave blank to keep the current key.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={saveBotSettings}
            disabled={saving || loadingSettings}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </Modal>
  );
}