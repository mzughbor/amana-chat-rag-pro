"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "~/components/ui/Button";
import Input from "~/components/ui/Input";
import Card from "~/components/ui/Card";

export default function ApiKeyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/site/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save API key");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-text-dark mb-2">OpenAI API Key Setup</h1>
        <p className="text-lg text-gray-600">
          Configure your OpenAI API key to enable AI features
        </p>
      </div>

      <div style={{ animationDelay: '0.1s' }}>
        <Card className="p-8 animate-fade-in">
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Enter your OpenAI API key. This key will be encrypted and used to generate
            embeddings and chat completions. You can get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 font-medium underline"
            >
              OpenAI Platform
            </a>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    API key saved successfully!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          <Input
            label="OpenAI API Key"
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
            placeholder="sk-..."
            helperText="Your API key is encrypted at rest and only used for your requests."
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || success}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating and saving...
              </span>
            ) : success ? (
              'Saved!'
            ) : (
              'Save API Key'
            )}
          </Button>
        </form>
      </Card>
      </div>
    </div>
  );
}

