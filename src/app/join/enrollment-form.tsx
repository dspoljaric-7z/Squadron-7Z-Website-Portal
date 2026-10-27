"use client";

import { useState } from "react";
import { CheckCircle, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { submitContactForm } from "@/app/contact/actions";

type Step = "eligibility" | "cadet" | "parent" | "done";

const ELIGIBILITY_CHECKS = [
  { id: "age", label: "My cadet is between ages 10 and 18 (or in 9th–12th grade for NSCC)" },
  { id: "citizen", label: "My cadet is a U.S. citizen or lawful permanent resident" },
  { id: "school", label: "My cadet is enrolled in school (homeschool counts)" },
  { id: "health", label: "My cadet is in generally good health with no major restrictions" },
];

type FormData = {
  eligibility: Record<string, boolean>;
  cadet: {
    firstName: string;
    lastName: string;
    dob: string;
    grade: string;
    school: string;
    city: string;
    phone: string;
    interests: string[];
  };
  parent: {
    firstName: string;
    lastName: string;
    relationship: string;
    email: string;
    phone: string;
    questions: string;
  };
};

const INTEREST_OPTIONS = [
  "Aviation", "Medical / EMT", "SCUBA / Diving", "Special Operations",
  "STEM / Cybersecurity", "Seamanship", "Leadership / Officer Track", "Music / Arts",
];

export function EnrollmentForm() {
  const [step, setStep] = useState<Step>("eligibility");
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FormData>({
    eligibility: {},
    cadet: { firstName: "", lastName: "", dob: "", grade: "", school: "", city: "", phone: "", interests: [] },
    parent: { firstName: "", lastName: "", relationship: "", email: "", phone: "", questions: "" },
  });

  const allEligible = ELIGIBILITY_CHECKS.every((c) => data.eligibility[c.id]);

  function toggleInterest(interest: string) {
    setData((prev) => ({
      ...prev,
      cadet: {
        ...prev.cadet,
        interests: prev.cadet.interests.includes(interest)
          ? prev.cadet.interests.filter((i) => i !== interest)
          : [...prev.cadet.interests, interest],
      },
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("name", `${data.parent.firstName} ${data.parent.lastName}`);
      body.append("email", data.parent.email);
      body.append("phone", data.parent.phone);
      body.append("subject", "New Enrollment Interest — Sea Cadets SQ7Z");
      body.append(
        "message",
        `PROSPECTIVE CADET ENROLLMENT\n\n` +
        `Cadet: ${data.cadet.firstName} ${data.cadet.lastName}\n` +
        `DOB: ${data.cadet.dob} · Grade: ${data.cadet.grade}\n` +
        `School: ${data.cadet.school}, ${data.cadet.city}\n` +
        `Interests: ${data.cadet.interests.join(", ") || "none listed"}\n\n` +
        `PARENT/GUARDIAN\n` +
        `Name: ${data.parent.firstName} ${data.parent.lastName} (${data.parent.relationship})\n` +
        `Email: ${data.parent.email}\n` +
        `Phone: ${data.parent.phone}\n\n` +
        (data.parent.questions ? `Questions/Notes:\n${data.parent.questions}` : "")
      );

      const result = await submitContactForm(body);
      if ("error" in result) throw new Error(result.error);
      setStep("done");
    } catch (err) {
      alert((err as Error).message || "Something went wrong. Please email us directly or call the unit.");
    } finally {
      setSubmitting(false);
    }
  }

  const STEP_LABELS: { key: Step; label: string }[] = [
    { key: "eligibility", label: "Eligibility" },
    { key: "cadet", label: "Cadet Info" },
    { key: "parent", label: "Parent Info" },
  ];

  if (step === "done") {
    return (
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h3 className="mt-6 text-2xl font-black text-white">We&apos;ll be in touch.</h3>
        <p className="mt-3 text-white/50">
          Your enrollment interest has been submitted. Expect a response within 1 to 2 business days. In the meantime, feel free to come to any drill. No confirmation needed.
        </p>
        <p className="mt-6 text-sm text-white/30">2nd &amp; 4th Sunday · 9:00 AM – 3:00 PM · Quincy, MA</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03]">
      {/* Step indicator */}
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          {STEP_LABELS.map((s, i) => {
            const isActive = s.key === step;
            const isDone =
              (s.key === "eligibility" && (step === "cadet" || step === "parent")) ||
              (s.key === "cadet" && step === "parent");
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone ? "bg-green-500/20 text-green-400" :
                  isActive ? "bg-[#B8860B] text-white" :
                  "bg-white/5 text-white/25"
                }`}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-white" : isDone ? "text-white/40" : "text-white/20"}`}>
                  {s.label}
                </span>
                {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-white/15" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-8">
        {/* Step 1: Eligibility */}
        {step === "eligibility" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-white">Eligibility Check</h3>
              <p className="mt-1 text-sm text-white/45">Confirm these requirements apply before proceeding.</p>
            </div>
            <div className="space-y-3">
              {ELIGIBILITY_CHECKS.map((check) => (
                <label
                  key={check.id}
                  className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                    data.eligibility[check.id]
                      ? "border-[#B8860B]/30 bg-[#B8860B]/[0.05]"
                      : "border-white/8 hover:border-white/15"
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    data.eligibility[check.id] ? "border-[#B8860B] bg-[#B8860B]" : "border-white/20"
                  }`}>
                    {data.eligibility[check.id] && <span className="text-[10px] font-black text-white">✓</span>}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!data.eligibility[check.id]}
                    onChange={(e) => setData((prev) => ({ ...prev, eligibility: { ...prev.eligibility, [check.id]: e.target.checked } }))}
                  />
                  <span className="text-sm leading-relaxed text-white/70">{check.label}</span>
                </label>
              ))}
            </div>

            {!allEligible && Object.keys(data.eligibility).length > 0 && !allEligible && (
              <p className="text-sm text-white/40">Check all boxes to continue. If you&apos;re unsure, <a href="/contact" className="text-[#B8860B] hover:underline">contact us</a>. Many edge cases qualify.</p>
            )}

            <button
              onClick={() => setStep("cadet")}
              disabled={!allEligible}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#B8860B] py-3.5 text-sm font-bold text-white shadow-md shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to Cadet Info <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Cadet Info */}
        {step === "cadet" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-white">Cadet Information</h3>
              <p className="mt-1 text-sm text-white/45">Tell us about the prospective cadet.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">First Name *</label>
                <input
                  type="text"
                  value={data.cadet.firstName}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, firstName: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Last Name *</label>
                <input
                  type="text"
                  value={data.cadet.lastName}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, lastName: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Date of Birth *</label>
                <input
                  type="date"
                  value={data.cadet.dob}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, dob: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/25"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Current Grade *</label>
                <select
                  value={data.cadet.grade}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, grade: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-[#001233] px-4 py-2.5 text-sm text-white outline-none focus:border-white/25"
                >
                  <option value="">Select grade</option>
                  {["5th","6th","7th","8th","9th","10th","11th","12th","Homeschool"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">School / Program *</label>
                <input
                  type="text"
                  value={data.cadet.school}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, school: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="School name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">City / Town *</label>
                <input
                  type="text"
                  value={data.cadet.city}
                  onChange={(e) => setData((p) => ({ ...p, cadet: { ...p.cadet, city: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="City or town"
                />
              </div>
            </div>

            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/40">Training Interests (optional)</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const active = data.cadet.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-[#B8860B]/50 bg-[#B8860B]/10 text-[#B8860B]"
                          : "border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("eligibility")}
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep("parent")}
                disabled={!data.cadet.firstName || !data.cadet.lastName || !data.cadet.dob || !data.cadet.grade || !data.cadet.school || !data.cadet.city}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#B8860B] py-3 text-sm font-bold text-white shadow-md shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Parent Info <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Parent Info */}
        {step === "parent" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-white">Parent / Guardian</h3>
              <p className="mt-1 text-sm text-white/45">We&apos;ll contact you to confirm your cadet&apos;s first drill.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">First Name *</label>
                <input
                  type="text"
                  value={data.parent.firstName}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, firstName: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Last Name *</label>
                <input
                  type="text"
                  value={data.parent.lastName}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, lastName: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Relationship *</label>
                <select
                  value={data.parent.relationship}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, relationship: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-[#001233] px-4 py-2.5 text-sm text-white outline-none focus:border-white/25"
                >
                  <option value="">Select…</option>
                  {["Parent","Guardian","Grandparent","Other"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Email *</label>
                <input
                  type="email"
                  value={data.parent.email}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, email: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="your@email.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Phone *</label>
                <input
                  type="tel"
                  value={data.parent.phone}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, phone: e.target.value } }))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/40">Questions or Notes (optional)</label>
                <textarea
                  value={data.parent.questions}
                  onChange={(e) => setData((p) => ({ ...p, parent: { ...p.parent, questions: e.target.value } }))}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/25"
                  placeholder="Anything you'd like us to know…"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs leading-relaxed text-white/35">
                By submitting, you consent to being contacted by Squadron 7-Zulu staff regarding your cadet&apos;s enrollment. We do not share your information with third parties.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("cadet")}
                className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !data.parent.firstName || !data.parent.lastName || !data.parent.email || !data.parent.phone || !data.parent.relationship}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#B8860B] py-3 text-sm font-bold text-white shadow-md shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit Enrollment Interest <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
