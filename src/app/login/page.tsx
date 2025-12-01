"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import Button from "~/components/common/Button";
import Input from "~/components/common/Input";
import Card from "~/components/common/Card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to callbackUrl or dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      // Ensure callbackUrl is a relative path (security)
      const safeCallbackUrl = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
      router.push(safeCallbackUrl);
      router.refresh();
    }
  }, [session, status, router, searchParams]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error messages
        if (result.error.includes("Email not confirmed")) {
          setError("Please verify your email address before signing in. Check your inbox for the verification link.");
        } else if (result.error.includes("Invalid email or password")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(result.error);
        }
        setLoading(false);
      } else if (result?.ok) {
        // Migrate guest bots after successful login
        await migrateGuestBots();

        // Get callbackUrl from query params or default to dashboard
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        // Ensure callbackUrl is a relative path (security)
        const safeCallbackUrl = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
        
        // Log for debugging in production
        if (process.env.NODE_ENV === "production") {
          console.log(`[LoginPage] Redirecting to: ${safeCallbackUrl}`);
        }
        
        // Wait a bit for session to update, then redirect
        setTimeout(() => {
          router.push(safeCallbackUrl);
          router.refresh();
        }, 100);
      } else {
        setError("An unexpected error occurred");
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="py-12">
      <div className="flex min-h-[calc(100vh-300px)] items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <Card className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome back
              </h1>
              <p className="text-slate-700">
                Sign in to your AmanaRAG account
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Sign up
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link
                  href="/resend-verification"
                  className="font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Resend verification email
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}