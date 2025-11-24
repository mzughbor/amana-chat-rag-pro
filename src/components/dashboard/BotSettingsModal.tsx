"use client";

import { useState } from "react";
import Modal from "~/components/ui/Modal";
import Button from "~/components/ui/Button";

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
}

export default function BotSettingsModal({
  isOpen,
  onClose,
  bot,
}: BotSettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6B46C1");
  const [cornerRadius, setCornerRadius] = useState("rounded-full");
  const widgetUrl = "https://cdn.example.com/widget.js";
  const snippet = `<script src="${widgetUrl}" data-bot-id="${bot.id}"></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bot Settings" size="lg">
      <div className="space-y-6">
        {/* Widget Preview */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Widget Preview
          </h3>
          <div className="relative border-2 border-gray-200 rounded-2xl p-8 bg-gray-50 min-h-[300px] flex items-center justify-center">
            <div className="absolute bottom-6 right-6">
              {/* Floating Chat Button Preview */}
              <div
                className={`w-14 h-14 ${cornerRadius} shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110`}
                style={{ backgroundColor: primaryColor }}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
            <p className="text-sm text-slate-600 text-center">
              This is how the chat widget will appear on your website
            </p>
          </div>
        </div>

        {/* Theme Controls */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Theme Controls
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-600"
                  placeholder="#6B46C1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Corner Radius
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "rounded-none", label: "Square" },
                  { value: "rounded-lg", label: "Small" },
                  { value: "rounded-2xl", label: "Medium" },
                  { value: "rounded-full", label: "Round" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCornerRadius(option.value)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      cornerRadius === option.value
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Snippet Generator */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Integration Code
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Copy and paste this code snippet into your website to add the chat widget:
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{snippet}</code>
              </pre>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyCode}
                className="absolute top-2 right-2"
              >
                {copied ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
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
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Code
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
