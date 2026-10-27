"use client";

import { useState } from "react";
import { submitContactForm } from "@/app/contact/actions";
import { Send, CheckCircle, Loader2 } from "lucide-react";

export function AlumniSubmitForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const raw = new FormData(e.currentTarget);
    // Package as a contact inquiry with "Alumni Story" subject
    const fd = new FormData();
    fd.set("name", raw.get("name") as string);
    fd.set("email", raw.get("email") as string);
    fd.set("subject", "Alumni Story Submission");
    const msg = `Years in unit: ${raw.get("years")}\nCurrent role: ${raw.get("now")}\nStory: ${raw.get("story")}`;
    fd.set("message", msg);
    const result = await submitContactForm(fd);
    if ("error" in result) { setErrorMsg(result.error); setStatus("error"); }
    else { setStatus("success"); }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-500/20 bg-green-500/5 px-8 py-12 text-center">
        <CheckCircle className="h-8 w-8 text-green-400" />
        <div>
          <p className="text-lg font-bold text-white">Thanks for sharing your story.</p>
          <p className="mt-1 text-sm text-white/50">We will follow up before adding your profile to the page.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
            Your Name <span className="text-[#B8860B]">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="Full name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/15"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
            Email <span className="text-[#B8860B]">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/15"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
            Years in Unit
          </label>
          <input
            name="years"
            placeholder="e.g. 2017 – 2021"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/15"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
            Where Are You Now?
          </label>
          <input
            name="now"
            placeholder="College, career, military branch…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/15"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
          Your Story <span className="text-[#B8860B]">*</span>
        </label>
        <textarea
          name="story"
          required
          rows={5}
          placeholder="How did Sea Cadets shape where you are today? What trainings did you attend? What do you remember most?"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#B8860B]/50 focus:ring-2 focus:ring-[#B8860B]/15"
        />
      </div>

      {status === "error" && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#9a7009] disabled:opacity-60"
      >
        {status === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Submit Your Story</>}
      </button>
    </form>
  );
}
