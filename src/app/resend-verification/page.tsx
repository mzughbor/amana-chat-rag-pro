"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "~/lib/supabase";
import Button from "~/components/ui/Button";
import Input from "~/components/ui/Input";
import Card from "~/components/ui/Card";

export default function ResendVerificationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?verification_sent=true");
        }, 3000);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-12">
      <div className="flex min-h-[calc(100vh-300px)] items-center justify-center">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Resend Verification Email
            </h1>
            <p className="text-gray-600">
              Enter your email address to receive a new verification link
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleResend}>
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
                      Verification email sent!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Please check your inbox and click the link to verify your account.
                    </p>
                  </div>
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
                  Sending...
                </span>
              ) : success ? (
                'Email Sent!'
              ) : (
                'Resend Verification Email'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to login
            </Link>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

