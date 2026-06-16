"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ActionResult = { error?: string } | void;

export async function login(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function register(formData: FormData): Promise<ActionResult> {
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "cadet");
  const parentOfName = String(formData.get("parentOfName") ?? "").trim();

  if (!inviteCode || !fullName || !email || !password) {
    return { error: "All fields are required." };
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
