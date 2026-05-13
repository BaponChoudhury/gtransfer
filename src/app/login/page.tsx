"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const URL_ERROR_MESSAGES: Record<string, string> = {
  auth_failed:    "Sign-in failed. Please try again.",
  session_lost:   "Your session expired during the account connect flow. Please sign in again.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? (URL_ERROR_MESSAGES[urlError] ?? "An error occurred. Please sign in again.") : null
  );

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile",
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
      // On success the browser redirects — no need to setLoading(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mb-4">
            <img src="/logo.png" alt="GTransfer" className="w-40 h-40 object-contain mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">GTransfer</h1>
          <p className="text-gray-500 mt-1">Manage and transfer files across all your accounts</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          {[
            { icon: "📁", text: "Transfer files between Google Drive accounts" },
            { icon: "📧", text: "Offload large Gmail attachments to another account" },
            { icon: "⭐", text: "One-time payment, no subscription" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <span className="text-lg">{icon}</span>
              <span className="text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign in card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle>Sign in to get started</CardTitle>
            <CardDescription>We use your Google account to manage your connections securely.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <Button
              className="w-full gap-3 h-12 text-base"
              variant="outline"
              onClick={signInWithGoogle}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Signing in…" : "Continue with Google"}
            </Button>
            <p className="text-xs text-gray-400 text-center mt-4">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              Your tokens are stored encrypted and never shared.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
