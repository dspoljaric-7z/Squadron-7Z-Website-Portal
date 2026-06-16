"use client";

import { useState, useTransition } from "react";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      className="space-y-4"
    >
      {registered && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Account created. You can now log in.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full bg-[#003087] hover:bg-[#002266]" disabled={pending}>
        {pending ? "Signing in..." : "Log In"}
      </Button>
      <p className="text-center text-sm text-gray-500">
        Need an account?{" "}
        <a href="/register" className="font-medium text-[#003087] underline">
          Register with invite code
        </a>
      </p>
    </form>
  );
}
