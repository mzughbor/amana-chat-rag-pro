"use client";

import { useState, useEffect } from "react";
import Modal from "~/components/common/Modal";
import Button from "~/components/common/Button";
import Input from "~/components/common/Input";
import Toast from "~/components/common/Toast";

const STORAGE_KEY = "amana-bot-wizard-draft";

interface Bot {
  id: string;
  name: string;
  welcomeMessage: string;
  createdAt: string;
}

interface CreateBotWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (bot: Bot) => void;
}

export default function CreateBotWizard({
  isOpen,
  onClose,
  onComplete,
}: CreateBotWizardProps) {
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState("");
  const [siteName, setSiteName] = useState(""); // Add site name state
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! How can I help you today?",
  );
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [apiKeyValidated, setApiKeyValidated] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");

  // Load saved draft from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.step) setStep(draft.step);
          if (draft.botName) setBotName(draft.botName);
          if (draft.welcomeMessage) setWelcomeMessage(draft.welcomeMessage);
          if (draft.apiKey) setApiKey(draft.apiKey);
          if (draft.apiKeyValidated) setApiKeyValidated(draft.apiKeyValidated);
          // Note: File cannot be saved to localStorage, user will need to re-upload
        } catch (error) {
          console.error("Error loading draft:", error);
          // Clear corrupted draft
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, [isOpen]);

  // Save draft to localStorage whenever data changes
  useEffect(() => {
    if (isOpen && (botName || welcomeMessage !== "Hello! How can I help you today?" || apiKey)) {
      const draft = {
        step,
        botName,
        welcomeMessage,
        apiKey,
        apiKeyValidated,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [isOpen, step, botName, welcomeMessage, apiKey, apiKeyValidated]);

  const handleNext = () => {
    if (step === 1) {
      if (!botName.trim()) {
        setError("Please fill in the bot name");
        return;
      }
      if (!siteName.trim()) {
        setError("Please fill in the site name");
        return;
      }
      setError("");
      setStep(2);
    }
  };

  const handleComplete = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    if (!apiKeyValidated) {
      setError("Please validate your API key before proceeding");
      setToastMessage("Please click 'Test API Key' to validate your key first");
      setToastType("error");
      setToastVisible(true);
      return;
    }

    setCreatingSite(true);
    setError("");

    try {
      // Create site and bot in one request
      const response = await fetch("/api/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteName: siteName, // Use site name
          botName: botName,
          welcomeMessage: welcomeMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create bot");
      }

      // Save API key if provided
      if (apiKey && apiKey.trim()) {
        const apiKeyResponse = await fetch(`/api/bots/${data.id}/api-key`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: apiKey,
          }),
        });

        const apiKeyData = await apiKeyResponse.json();

        if (!apiKeyResponse.ok) {
          throw new Error(apiKeyData.message || apiKeyData.error || "Failed to save API key");
        }
      }

      // Create bot object with real ID from database
      const newBot: Bot = {
        id: data.id,
        name: data.name,
        welcomeMessage: data.welcomeMessage || welcomeMessage,
        createdAt: data.createdAt,
      };

      // Call onComplete callback with newly created bot
      onComplete(newBot);

      // Reset wizard state and close modal
      resetWizard(true);
      onClose();
    } catch (err) {
      console.error("Error creating bot:", err);
      setError(err instanceof Error ? err.message : "Failed to create bot");
      setToastMessage("Failed to create bot. Please try again.");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setCreatingSite(false);
    }
  };

  const resetWizard = (clearStorage = true) => {
    setStep(1);
    setBotName("");
    setWelcomeMessage("Hello! How can I help you today?");
    setApiKey("");
    setError("");
    setApiKeyValidated(false);
    setApiKeyError("");
    if (clearStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleClose = () => {
    // Don't clear storage when closing - keep draft for next time
    resetWizard(false);
    onClose();
  };

  const handleCancel = () => {
    // Clear storage only when user explicitly cancels
    resetWizard(true);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Bot" size="lg">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step >= s
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-slate-600"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? "bg-purple-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Bot Name + Welcome Message */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Bot Name"
              id="botName"
              type="text"
              required
              placeholder="My Support Bot"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
            />
            <Input
              label="Site Name"
              id="siteName"
              type="text"
              required
              placeholder="example.com"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              helperText="Enter your website domain (e.g., example.com)"
            />
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Welcome Message
              </label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="Hello! How can I help you today?"
              />
              <p className="mt-1 text-xs text-gray-500">
                This message appears at the top of the chat and test widget preview.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: API Key */}
        {step === 2 && (
          <div className="space-y-4">
            <Input
              label="API Key (BYOK)"
              id="apiKey"
              type="password"
              required
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                // Reset validation state when user types
                if (apiKeyValidated || apiKeyError) {
                  setApiKeyValidated(false);
                  setApiKeyError("");
                }
              }}
              helperText="Your API key is encrypted and stored securely. Must start with 'sk-'"
            />
            {/* API Key Validation Status */}
            {apiKeyValidated && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">API Key Validated Successfully</p>
                    <p className="text-xs text-green-700 mt-1">Your API key is valid and ready to use.</p>
                  </div>
                </div>
              </div>
            )}

            {apiKeyError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Validation Failed</p>
                    <p className="text-xs text-red-700 mt-1">{apiKeyError}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const trimmedKey = apiKey.trim();
                
                // Reset previous validation state
                setApiKeyValidated(false);
                setApiKeyError("");
                
                if (!trimmedKey) {
                  setApiKeyError("Please enter an API key first");
                  setToastMessage("Please enter an API key first");
                  setToastType("error");
                  setToastVisible(true);
                  return;
                }

                // Client-side format validation
                if (!trimmedKey.startsWith("sk-")) {
                  const errorMsg = "Invalid API key format. OpenAI API keys must start with 'sk-'";
                  setApiKeyError(errorMsg);
                  setToastMessage(errorMsg);
                  setToastType("error");
                  setToastVisible(true);
                  return;
                }

                // Basic length check - OpenAI keys are typically 20-200 characters
                // We'll rely on actual API validation instead of strict length checks
                if (trimmedKey.length < 10) {
                  const errorMsg = "API key is too short. Please check your key.";
                  setApiKeyError(errorMsg);
                  setToastMessage(errorMsg);
                  setToastType("error");
                  setToastVisible(true);
                  return;
                }

                setTestingApiKey(true);
                
                try {
                  // Call validation API endpoint
                  const response = await fetch("/api/validate-api-key", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ apiKey: trimmedKey }),
                  });

                  const data = await response.json();

                  if (response.ok && data.valid) {
                    setApiKeyValidated(true);
                    setApiKeyError("");
                    setToastMessage(data.message || "API key validated successfully!");
                    setToastType("success");
                    setToastVisible(true);
                  } else {
                    const errorMsg = data.details || data.error || "API key validation failed. Please check your key.";
                    setApiKeyValidated(false);
                    setApiKeyError(errorMsg);
                    setToastMessage(errorMsg);
                    setToastType("error");
                    setToastVisible(true);
                  }
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : "Network error. Please check your connection and try again.";
                  setApiKeyValidated(false);
                  setApiKeyError(errorMsg);
                  setToastMessage(errorMsg);
                  setToastType("error");
                  setToastVisible(true);
                } finally {
                  setTestingApiKey(false);
                }
              }}
              disabled={testingApiKey || !apiKey.trim()}
            >
              {testingApiKey ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Validating...
                </span>
              ) : (
                "Test API Key"
              )}
            </Button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={step > 1 ? () => setStep(step - 1) : handleCancel}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step === 2 ? (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={creatingSite}
            >
              {creatingSite ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create Bot"
              )}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext}>
              Next
            </Button>
          )}
        </div>
      </div>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
      
      {/* Success Modal */}
    </Modal>
  );
}

