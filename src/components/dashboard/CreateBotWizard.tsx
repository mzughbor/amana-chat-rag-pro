"use client";

import { useState } from "react";
import Modal from "~/components/ui/Modal";
import Button from "~/components/ui/Button";
import Input from "~/components/ui/Input";
import Toast from "~/components/ui/Toast";

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

type IngestionStatus = "queued" | "running" | "done";

export default function CreateBotWizard({
  isOpen,
  onClose,
  onComplete,
}: CreateBotWizardProps) {
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus>("queued");
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [testingApiKey, setTestingApiKey] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/csv",
        "text/markdown",
        "text/plain",
      ];
      const allowedExtensions = [".pdf", ".docx", ".doc", ".csv", ".md", ".txt"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (
        allowedTypes.includes(file.type) ||
        allowedExtensions.includes(fileExtension)
      ) {
        setSelectedFile(file);
        setError("");
      } else {
        setError("Please upload a PDF, DOCX, CSV, or Markdown file");
        setSelectedFile(null);
      }
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!botName.trim() || !welcomeMessage.trim()) {
        setError("Please fill in all fields");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!apiKey.trim()) {
        setError("Please enter an API key");
        return;
      }
      setError("");
      setStep(3);
    } else if (step === 3) {
      if (!selectedFile) {
        setError("Please upload a file");
        return;
      }
      setError("");
      setStep(4);
      // Simulate ingestion process
      simulateIngestion();
    }
  };

  const simulateIngestion = () => {
    setIngestionStatus("queued");
    setTimeout(() => {
      setIngestionStatus("running");
      setTimeout(() => {
        setIngestionStatus("done");
      }, 2000);
    }, 500);
  };

  const handleComplete = () => {
    const newBot: Bot = {
      id: Date.now().toString(),
      name: botName,
      welcomeMessage,
      createdAt: new Date().toISOString(),
    };
    onComplete(newBot);
    resetWizard();
  };

  const resetWizard = () => {
    setStep(1);
    setBotName("");
    setWelcomeMessage("");
    setApiKey("");
    setSelectedFile(null);
    setIngestionStatus("queued");
    setError("");
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Bot" size="lg">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && (
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Welcome Message
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-600"
                rows={4}
                required
                placeholder="Hello! How can I help you today?"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
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
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              helperText="Your API key is encrypted and stored securely"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (!apiKey.trim()) {
                  setToastMessage("Please enter an API key first");
                  setToastType("error");
                  setToastVisible(true);
                  return;
                }
                setTestingApiKey(true);
                // Simulate API key test
                setTimeout(() => {
                  setTestingApiKey(false);
                  // Random success/failure for demo
                  const success = Math.random() > 0.3;
                  if (success) {
                    setToastMessage("API key validated successfully!");
                    setToastType("success");
                  } else {
                    setToastMessage("API key validation failed. Please check your key.");
                    setToastType("error");
                  }
                  setToastVisible(true);
                }, 1000);
              }}
              disabled={testingApiKey || !apiKey.trim()}
            >
              {testingApiKey ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Testing...
                </span>
              ) : (
                "Test API Key"
              )}
            </Button>
          </div>
        )}

        {/* Step 3: File Upload */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-purple-600 transition-colors">
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.csv,.md,.txt"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="fileUpload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF, DOCX, CSV, or Markdown (MAX. 10MB)
                  </span>
                </label>
                {selectedFile && (
                  <div className="mt-4 p-3 bg-background-secondary rounded-lg">
                    <p className="text-sm text-gray-700">
                      Selected: {selectedFile.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Ingestion Status */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="mb-4">
                {ingestionStatus === "queued" && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      Queued
                    </p>
                    <p className="text-sm text-slate-700">
                      Your document is in the queue
                    </p>
                  </div>
                )}
                {ingestionStatus === "running" && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                      <svg
                        className="animate-spin w-8 h-8 text-purple-600"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      Running
                    </p>
                    <p className="text-sm text-slate-700">
                      Processing your document...
                    </p>
                  </div>
                )}
                {ingestionStatus === "done" && (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
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
                    <p className="text-lg font-semibold text-slate-900">Done</p>
                    <p className="text-sm text-slate-700">
                      Your bot is ready to use!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={step > 1 ? () => setStep(step - 1) : handleClose}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button variant="primary" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={ingestionStatus !== "done"}
            >
              Complete
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
    </Modal>
  );
}

