"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ContactResult = { success: true } | { error: string };

// 10-minute window, max 3 submissions per IP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

export async function submitContactForm(formData: FormData): Promise<ContactResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";
  const source = (formData.get("source") as string | null)?.trim() || null;
  // Honeypot — bots fill this, humans don't see it
  const honeypot = (formData.get("_confirm_email") as string | null) ?? "";

  if (honeypot) return { success: true }; // silently drop bot submissions

  if (!name || !email || !subject || !message) {
    return { error: "Please fill in all required fields." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (message.length < 10) {
    return { error: "Your message is too short." };
  }

  // Rate limit by IP
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const supabase = await createClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("contact_inquiries" as never)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash" as never, ip)
    .gte("created_at" as never, windowStart);

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return { error: "Too many submissions. Please wait a few minutes and try again." };
  }

  const { error } = await supabase
    .from("contact_inquiries" as never)
    .insert({ name, email, phone, subject, message, source, ip_hash: ip } as never);

  if (error) {
    return { error: "Something went wrong. Please try again or show up to a drill." };
  }

  return { success: true };
}
