"use client";

import { useState, useTransition } from "react";
import { register } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("cadet");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("role", role);
        startTransition(async () => {
          const result = await register(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite Code</Label>
        <Input id="inviteCode" name="inviteCode" required placeholder="SQ7Z-XXXX-XXXX" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">I am a...</Label>
        <Select value={role} onValueChange={(v) => setRole(v ?? "cadet")}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cadet">Cadet</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Officer and NCO accounts are upgraded by an Officer after registration.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full bg-[#003087] hover:bg-[#002266]" disabled={pending}>
        {pending ? "Creating account..." : "Create Account"}
      </Button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-[#003087] underline">
          Log in
        </a>
      </p>
    </form>
  );
}
