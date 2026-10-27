"use client";

import { useState, useTransition } from "react";
import { login } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_denied: "Google sign-in was cancelled.",
  oauth_error: "Something went wrong with Google sign-in. Try again.",
  not_authorized: "Your Google account is not on the approved access list. Contact an officer.",
  link_expired: "This activation link has expired or already been used. Ask an officer to send a new one.",
};

export function LoginForm({ registered, oauthError }: { registered?: boolean; oauthError?: string }) {
  const [error, setError] = useState<string | null>(oauthError ? (ERROR_MESSAGES[oauthError] ?? oauthError) : null);
  const [pending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  const handleGoogle = async () => {
    setGooglePending(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(ERROR_MESSAGES.oauth_error);
      setGooglePending(false);
    }
    // On success the browser navigates away; no need to reset pending
  };

  return (
    <div className="space-y-5">
      {registered && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Account created — you can now sign in.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {/* Google OAuth */}
      <Button
        type="button"
        onClick={handleGoogle}
        disabled={googlePending || pending}
        variant="outline"
        className="h-11 w-full rounded-xl border-gray-200 text-sm font-semibold"
      >
        {googlePending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            Redirecting…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {/* Google G */}
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </span>
        )}
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-300">or sign in with email</span>
        </div>
      </div>

      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await login(formData);
            if (result?.error) setError(result.error);
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@squadron7zulu.org"
            className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:border-[#003087] focus:bg-white focus:ring-[#003087]/20"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 rounded-xl border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:border-[#003087] focus:bg-white focus:ring-[#003087]/20"
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-[#003087] text-sm font-semibold tracking-wide hover:bg-[#002266] disabled:opacity-50"
          disabled={pending || googlePending}
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" /> Sign In
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Need an account?{" "}
        <a href="/register" className="font-semibold text-[#003087] hover:underline">
          Register with invite code
        </a>
      </p>
    </div>
  );
}
