"use client";

import { useState } from "react";
import { submitContactForm } from "./actions";
import { Send, CheckCircle, Loader2 } from "lucide-react";

const SUBJECTS = [
  "General Information",
  "How to Join / Enrollment",
  "Program Questions (NLCC / NSCC)",
  "Drill Schedule",
  "Uniform & Gear",
  "Financial Assistance",
  "Parent / Guardian Inquiry",
  "Other",
];

const SOURCES = [
  "Our website",
  "Word of mouth / friend or family",
  "Social media",
  "School / teacher",
  "Saw us at an event",
  "Recruiting visit",
  "Other",
];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const result = await submitContactForm(formData);
    if ("error" in result) {
      setErrorMsg(result.error);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-green-500/20 bg-green-500/5 px-8 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">Message Sent!</h3>
          <p className="mt-2 text-white/55">
            Thank you for reaching out. A member of our staff will get back to you within 24–48 hours.
            You are also welcome to show up to any drill — we would love to meet you in person.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from real users, filled by bots */}
      <input name="_confirm_email" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
            Full Name <span className="text-[#B8860B]">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
            Email <span className="text-[#B8860B]">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
            Phone <span className="text-white/25">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="(617) 555-0100"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
            Subject <span className="text-[#B8860B]">*</span>
          </label>
          <select
            name="subject"
            required
            defaultValue=""
            className="w-full rounded-xl border border-white/10 bg-[#001233] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
          >
            <option value="" disabled className="text-white/30">Select a topic…</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s} className="bg-[#001233] text-white">{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
          How did you hear about us? <span className="text-white/25">(optional)</span>
        </label>
        <select
          name="source"
          defaultValue=""
          className="w-full rounded-xl border border-white/10 bg-[#001233] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
        >
          <option value="" className="text-white/30">Select…</option>
          {SOURCES.map((s) => (
            <option key={s} value={s} className="bg-[#001233] text-white">{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
          Message <span className="text-[#B8860B]">*</span>
        </label>
        <textarea
          name="message"
          required
          rows={6}
          placeholder="Tell us about yourself, your cadet, or any questions you have…"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/20"
        />
      </div>

      {status === "error" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#B8860B] px-8 py-4 font-bold text-white shadow-lg shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009] disabled:opacity-60"
      >
        {status === "loading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="h-4 w-4" /> Send Message</>
        )}
      </button>

      <p className="text-center text-xs text-white/25">
        We typically respond within 24–48 hours. You can also just show up at a drill — walk-ins are always welcome.
      </p>
    </form>
  );
}
