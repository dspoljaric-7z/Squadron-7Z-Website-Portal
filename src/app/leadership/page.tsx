import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";
import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import Image from "next/image";

export const metadata = {
  title: "Leadership | Squadron 7-Zulu",
  description: "Meet the officers and staff leading Naval Sea Cadet Corps Squadron 7-Zulu in Quincy, MA.",
};

type LeadershipEntry = {
  id: string;
  title: string;
  name: string;
  initials: string;
  description: string;
  sort_order: number;
  photo_url?: string | null;
};

type SiteSettings = {
  unit_name?: string;
  co_intent?: string | null;
};

const FALLBACK: LeadershipEntry[] = [
  { id: "1", title: "Commanding Officer", name: "Officer Billet", initials: "CO", description: "Responsible for the overall command, training, and welfare of the unit and all cadets under their charge.", sort_order: 1 },
  { id: "2", title: "Executive Officer", name: "Officer Billet", initials: "XO", description: "Second in command. Manages day-to-day operations, officer staff coordination, and cadet programs.", sort_order: 2 },
];

const ENLISTED_TIERS = [
  { title: "Chief Petty Officer", abbr: "CPO", desc: "E7 — highest cadet rank. Earned through a Chief Board and national approval. Sets the tone for the entire enlisted corps." },
  { title: "Senior Petty Officers", abbr: "SNCO", desc: "E5–E6 cadets who lead divisions, run instruction blocks, and set the standard for everyone below them." },
  { title: "Petty Officers", abbr: "PO", desc: "E4 cadets who have earned their stripes and hold billets across every division." },
];

export default async function LeadershipPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();
  const [{ data: leadershipData }, { data: settings }] = await Promise.all([
    supabase.from("leadership" as never).select("*").order("sort_order", { ascending: true }),
    supabase.from("site_settings").select("*").eq("id", 1).single(),
  ]);

  const officers = ((leadershipData as LeadershipEntry[] | null) ?? []).length > 0
    ? (leadershipData as LeadershipEntry[])
    : FALLBACK;

  const coIntent = (settings as SiteSettings | null)?.co_intent ?? null;

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">Unit Leadership</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Who&apos;s in charge.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
            Squadron 7-Zulu is led by commissioned officers and a cadet chain of command. Every person here earned their position.
          </p>
        </div>
      </section>

      {/* CO's Intent */}
      {coIntent && (
        <section className="border-b border-white/5 bg-[#000d24] px-6 py-16 sm:px-14 lg:px-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Commanding Officer&apos;s Intent</p>
            <blockquote className="border-l-4 border-[#B8860B] pl-6 text-xl leading-relaxed text-white/75 italic">
              &ldquo;{coIntent}&rdquo;
            </blockquote>
            <p className="mt-4 pl-6 text-sm text-white/35">— Commanding Officer, Squadron 7-Zulu</p>
          </div>
        </section>
      )}

      {!coIntent && (
        <section className="border-b border-white/5 bg-[#000d24] px-6 py-16 sm:px-14 lg:px-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Commanding Officer&apos;s Intent</p>
            <blockquote className="border-l-4 border-[#B8860B] pl-6 text-xl leading-relaxed text-white/75 italic">
              &ldquo;Our mission is simple: develop leaders of character. Every drill, every training, every decision we make as a unit is in service of that goal. We hold our cadets to a high standard because we believe in what they are capable of — and we hold ourselves to an even higher one.&rdquo;
            </blockquote>
            <p className="mt-4 pl-6 text-sm text-white/35">— Commanding Officer, Squadron 7-Zulu</p>
          </div>
        </section>
      )}

      {/* Officer Staff */}
      <section className="px-6 py-24 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#003087]/40">
              <Shield className="h-5 w-5 text-[#B8860B]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#B8860B]">Commissioned Officers</p>
              <h2 className="text-2xl font-black text-white">Officer Staff</h2>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {officers.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-7">
                <div className="mb-5 flex items-center gap-4">
                  {entry.photo_url ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={entry.photo_url}
                        alt={entry.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#003087]/50 text-sm font-black text-[#B8860B]">
                      {entry.initials}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-white">{entry.name}</p>
                    <p className="text-sm font-semibold text-[#B8860B]">{entry.title}</p>
                  </div>
                </div>
                {entry.description && (
                  <p className="text-sm leading-relaxed text-white/50">{entry.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cadet Chain of Command */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-24 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Cadet Leadership</p>
          <h2 className="mb-12 text-4xl font-black text-white sm:text-5xl">Cadet Chain of Command</h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {ENLISTED_TIERS.map((e) => (
              <div key={e.title} className="rounded-2xl border border-white/8 bg-white/[0.02] p-7">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B8860B]">{e.abbr}</p>
                <h3 className="mb-3 text-lg font-black text-white">{e.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{e.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-7">
            <p className="mb-2 text-sm font-bold text-white">How cadet rank works</p>
            <p className="text-sm leading-relaxed text-white/50">
              Rank in Squadron 7-Zulu is earned, not handed out. Every stripe reflects real work: completing training, demonstrating leadership, and earning the trust of peers and officers. Cadets advance through seven enlisted paygrades from Seaman Recruit up to Chief Petty Officer — the same structure as the real Navy enlisted side.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center sm:px-14 lg:px-24">
        <h2 className="mb-4 text-3xl font-black text-white">Want to be part of this team?</h2>
        <p className="mb-8 text-white/50">Leadership billets open every year. You earn them through the advancement system.</p>
        <Link
          href="/join"
          className="inline-flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 font-bold text-white transition-all hover:bg-[#9a7009]"
        >
          Join the Unit <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
