"use client";

import { useState, useTransition } from "react";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

export function LoginForm({ registered }: { registered?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await login(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-5"
    >
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
        className="mt-2 h-11 w-full rounded-xl bg-[#003087] text-sm font-semibold tracking-wide hover:bg-[#002266] disabled:opacity-50"
        disabled={pending}
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

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-300">or</span>
        </div>
      </div>

      <p className="text-center text-sm text-gray-400">
        Need an account?{" "}
        <a href="/register" className="font-semibold text-[#003087] hover:underline">
          Register with invite code
        </a>
      </p>
    </form>
  );
}
