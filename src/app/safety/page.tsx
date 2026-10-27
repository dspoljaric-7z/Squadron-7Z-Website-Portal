import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";
import Link from "next/link";
import { ShieldCheck, Users, MessageSquareOff, Phone, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Safety & Youth Protection | Squadron 7-Zulu",
  description: "Youth protection policies for Naval Sea Cadet Corps Squadron 7-Zulu, including two-deep leadership, safe messaging, and background check requirements.",
};

export default async function SafetyPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">Youth Protection</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Safety & Youth<br />Protection Policy
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
            Squadron 7-Zulu follows national NSCC youth protection guidelines. This page explains how we keep cadets safe and what parents should know about officer conduct and cadet supervision.
          </p>
        </div>
      </section>

      {/* Core policies */}
      <section className="px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl space-y-6">

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                <Users className="h-5 w-5 text-[#B8860B]" />
              </div>
              <h2 className="text-xl font-black text-white">Two-Deep Leadership</h2>
            </div>
            <p className="mb-4 leading-relaxed text-white/60">
              No adult officer or volunteer is ever alone with a cadet. All activities, instruction, and conversations between an adult and a cadet take place with at least one other adult present, or in a setting where other cadets and adults are in the immediate area.
            </p>
            <p className="leading-relaxed text-white/60">
              This applies at drills, national trainings, unit events, and any other program activity. No exceptions. If you observe an adult alone with a cadet in a closed or isolated setting, report it immediately to the Commanding Officer or another senior officer.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                <ShieldCheck className="h-5 w-5 text-[#B8860B]" />
              </div>
              <h2 className="text-xl font-black text-white">Background Checks</h2>
            </div>
            <p className="mb-4 leading-relaxed text-white/60">
              All adult officers and volunteers in Squadron 7-Zulu are required to complete a background check through the Navy League of the United States before being permitted to work with cadets. Background checks are renewed on a regular cycle as required by national NSCC policy.
            </p>
            <p className="leading-relaxed text-white/60">
              Adults who have not completed a cleared background check are not authorized to supervise cadets, lead instruction, or participate in any capacity that involves direct cadet contact. If you have questions about the background check status of a specific officer, contact the Commanding Officer.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                <MessageSquareOff className="h-5 w-5 text-[#B8860B]" />
              </div>
              <h2 className="text-xl font-black text-white">Safe Messaging Guidelines</h2>
            </div>
            <p className="mb-4 leading-relaxed text-white/60">
              Adult officers and volunteers do not communicate with cadets through private channels. All officer-to-cadet communication takes place through:
            </p>
            <ul className="mb-4 space-y-2 text-sm leading-relaxed text-white/55">
              {[
                "Official unit channels (group chats, unit email lists, or the cadet portal)",
                "Email with the cadet's parent or guardian copied",
                "In-person at drills or unit events with other adults present",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8860B]/60" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="leading-relaxed text-white/60">
              Officers do not exchange personal phone numbers with individual cadets, do not communicate via private social media direct messages, and do not use personal platforms to conduct unit business with minors. If a cadet receives a private message from an adult in the unit through an unofficial channel, the parent should report it to the Commanding Officer immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                <AlertTriangle className="h-5 w-5 text-[#B8860B]" />
              </div>
              <h2 className="text-xl font-black text-white">Reporting Concerns</h2>
            </div>
            <p className="mb-4 leading-relaxed text-white/60">
              If you observe or are made aware of conduct that concerns you — an officer violating any of the above policies, inappropriate behavior toward a cadet, or any situation where a cadet&apos;s safety may be at risk — you have several paths to report it:
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-sm font-bold text-white">Within the unit</p>
                <p className="text-sm text-white/50">Contact the Commanding Officer or Executive Officer directly at a drill or via the unit email. If the concern involves the CO, contact the XO or the district officer.</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-sm font-bold text-white">Navy League of the United States</p>
                <p className="text-sm text-white/50">The NSCC is governed by the Navy League. Concerns can be reported directly to the national program office at <span className="text-[#B8860B]">seacadets.org</span>.</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-sm font-bold text-white">Law enforcement</p>
                <p className="text-sm text-white/50">If you believe a crime has been committed or a cadet is in immediate danger, contact local law enforcement. Do not wait for internal reporting if you believe a cadet is at immediate risk.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                <Phone className="h-5 w-5 text-[#B8860B]" />
              </div>
              <h2 className="text-xl font-black text-white">Medical & Emergency Procedures</h2>
            </div>
            <p className="mb-4 leading-relaxed text-white/60">
              All cadets have an emergency contact and medical information on file before participating in drills. Officers review medical alerts (allergies, medications, conditions) before each drill. At least one officer with current first aid or CPR certification is present at every drill.
            </p>
            <p className="mb-4 leading-relaxed text-white/60">
              In the event of a medical emergency during a drill, the unit will call 911, administer first aid within the scope of officer training, contact the cadet&apos;s emergency contact immediately, and file an incident report documenting the event.
            </p>
            <p className="leading-relaxed text-white/60">
              Parents are asked to ensure cadet medical information is current. Notify unit staff of any changes to emergency contacts, medications, or health conditions at the start of each drill year.
            </p>
          </div>

        </div>
      </section>

      {/* ADA */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-16 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-5 text-2xl font-black text-white">ADA & Accommodation Policy</h2>
          <p className="leading-relaxed text-white/60">
            In compliance with the Americans with Disabilities Act, it is the policy of the Naval Sea Cadet Corps that no qualified person will be excluded from participation in, denied the benefits of, or subjected to discrimination simply because of a disability. Squadron 7-Zulu will grant reasonable accommodations where necessary to permit full participation.
          </p>
          <p className="mt-4 leading-relaxed text-white/60">
            If your cadet has a disability or needs an accommodation to participate, contact unit staff before the first drill so we can prepare appropriately. We want to make participation work.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="px-6 py-16 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-2xl font-black text-white">Questions about this policy?</h2>
          <p className="mb-6 text-white/50">Contact us directly or ask any of our officers at a drill. These policies exist to protect cadets, and we take them seriously.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-[#B8860B] px-7 py-3 font-bold text-white transition-all hover:bg-[#9a7009]">
              Contact Us
            </Link>
            <Link href="/parents" className="rounded-full border border-white/15 px-7 py-3 font-semibold text-white transition-all hover:bg-white/5">
              Parent Guide
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
