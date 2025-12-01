"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupSuccess?: () => void;
}

export default function SignupModal({ isOpen, onClose, onSignupSuccess }: SignupModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Sign up
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to create account");
          setLoading(false);
          return;
        }

        // After successful signup, automatically sign in
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError("Account created but failed to sign in. Please try logging in.");
          setLoading(false);
          return;
        }

        // Migrate guest bots after successful signup/login
        await migrateGuestBots();

        if (onSignupSuccess) {
          onSignupSuccess();
        }

        // Close modal and refresh
        onClose();
        router.refresh();
      } else {
        // Login
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }

        // Migrate guest bots after successful login
        await migrateGuestBots();

        if (onSignupSuccess) {
          onSignupSuccess();
        }

        // Close modal and refresh
        onClose();
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const migrateGuestBots = async () => {
    // Get guestId from localStorage
    const guestId = localStorage.getItem("amana_guest_id");
    
    if (!guestId) {
      return; // No guest bots to migrate
    }

    try {
      const response = await fetch("/api/bots/migrate-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guestId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear guest ID after successful migration
        localStorage.removeItem("amana_guest_id");
        console.log(`Migrated ${data.migrated} guest bot(s)`);
      }
    } catch (err) {
      console.error("Failed to migrate guest bots:", err);
      // Don't show error to user, migration can happen later
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === "signup" ? "Sign Up to Save Your Bot" : "Sign In to Continue"}>
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            {mode === "signup"
              ? "Hey, if you want to save this bot and access it later, you need to sign up."
              : "Please sign in to save and manage your bots."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Please wait..." : mode === "signup" ? "Sign Up / Continue" : "Sign In"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
              }}
              className="text-sm text-slate-600 hover:text-slate-900 underline"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

