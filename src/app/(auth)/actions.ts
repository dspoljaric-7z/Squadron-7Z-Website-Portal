"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionResult = { error?: string } | void;

function getIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(formData: FormData): Promise<ActionResult> {
  const ip = getIp();
  const { allowed } = checkRateLimit({ action: "login", ip, limit: 5, windowMs: 15 * 60 * 1000 });
  if (!allowed) return { error: "Too many login attempts. Please wait 15 minutes and try again." };

  const email = String(formData.get("email") ?? "").slice(0, 255);
  const password = String(formData.get("password") ?? "").slice(0, 128);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<ActionResult> {
  const ip = getIp();
  const { allowed } = checkRateLimit({ action: "register", ip, limit: 3, windowMs: 60 * 60 * 1000 });
  if (!allowed) return { error: "Too many registration attempts. Please try again later." };

  const inviteCode = String(formData.get("inviteCode") ?? "").trim().slice(0, 50);
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().slice(0, 255);
  const password = String(formData.get("password") ?? "").slice(0, 128);
  const role = String(formData.get("role") ?? "cadet");
  const parentOfName = String(formData.get("parentOfName") ?? "").trim().slice(0, 100);

  if (!inviteCode || !fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  const { data: grantedRole, error: codeError } = await supabase.rpc("consume_invite_code", {
    p_code: inviteCode,
  });

  if (codeError || !grantedRole) {
    return { error: "Invalid or expired invite code." };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: grantedRole,
        parent_of_name: role === "parent" ? parentOfName : null,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  redirect("/login?registered=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
