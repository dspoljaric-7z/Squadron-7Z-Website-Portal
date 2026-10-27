import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Users, Shield, Star, Target, Flag, Trophy, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

type LeadershipEntry = { id: string; title: string; name: string; initials: string; description: string; sort_order: number };

const MILESTONES = [
  { year: "Founding", desc: "Squadron 7-Zulu was established in the Quincy, MA area as an official Naval Sea Cadet Corps unit, sponsored by the Navy League of the United States." },
  { year: "Expansion", desc: "The unit expanded to include both NLCC and NSCC programs, opening the path to cadets from age 10 through 18 across the South Shore." },
  { year: "National Reach", desc: "Cadets began attending national trainings at military installations coast to coast: aviation in Pensacola, SCUBA in Key West, special operations at Fort Benning, and more." },
  { year: "Today", desc: "An active unit drilling every 2nd and 4th Sunday out of Quincy, MA. Focused on doing the program right." },
];

export default async function AboutPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();
  const [{ data: settings }, { count: memberCount }, { data: leadershipData }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("active", true).eq("approved", true),
    supabase.from("leadership" as never).select("*").order("sort_order", { ascending: true }),
  ]);
  const unitName = settings?.unit_name ?? "Squadron 7-Zulu";
  const leadership = (leadershipData ?? []) as LeadershipEntry[];

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Page hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">About Us</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Who We Are
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-white/70">
            {unitName} is a Naval Sea Cadet Corps unit based in Quincy, Massachusetts.
          </p>
        </div>
      </section>

      {/* Mission + Sponsor */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Our Mission</p>
            <blockquote className="mb-8 border-l-4 border-[#B8860B] pl-6 text-2xl font-bold italic leading-snug text-white/90">
              &ldquo;The mission of the United States Naval Sea Cadet Corps is to build leaders of character by imbuing in our cadets the highest ideals of honor, respect, commitment, and service.&rdquo;
            </blockquote>
            <p className="mb-5 text-lg leading-relaxed text-white/70">
              We are sponsored by the <strong className="text-white">Navy League of the United States</strong> and
              supported by both the <strong className="text-white">U.S. Navy</strong> and <strong className="text-white">U.S. Coast Guard</strong>.
              Our program runs as a direct extension of the national NSCC framework.
            </p>
            <p className="text-lg leading-relaxed text-white/70">
              Sea Cadets are <strong className="text-white">NOT required to join the military</strong>. Our alumni
              go on to colleges, universities, trade schools, military academies, and careers in every industry.
              The program is different. The record they built here travels with them.
            </p>
          </div>

          <div className="space-y-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">The Four Goals</p>
            {(
              [
                { Icon: Target,  title: "Develop Leadership & Teamwork", desc: "Every rank earned, every billet held, every drill run builds the ability to lead." },
                { Icon: Flag,    title: "Instill Good Citizenship", desc: "How to show up. How to be accountable. How to treat people. That is what we teach." },
                { Icon: Trophy,  title: "Demonstrate a Life of Merit", desc: "Cadets learn to earn things — rank, certifications, trust — through actual work." },
                { Icon: Compass, title: "Expose Career Pathways", desc: "Aviation, medicine, engineering, law enforcement — cadets get hands-on exposure before they have to choose." },
              ] as { Icon: LucideIcon; title: string; desc: string }[]
            ).map((g) => (
              <div key={g.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#003087]/60">
                  <g.Icon className="h-5 w-5 text-[#B8860B]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{g.title}</h3>
                  <p className="mt-0.5 text-sm text-white/60">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="border-y border-white/8 bg-[#001a3d]">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-white/8">
          {[
            { value: memberCount ? `${memberCount}+` : "40+", label: "Active Cadets" },
            { value: "2", label: "Programs (NLCC + NSCC)" },
            { value: "Quincy, MA", label: "Home Base" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-10 text-center">
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/45">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Unit history timeline */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Our Story</p>
        <h2 className="mb-12 text-4xl font-black text-white sm:text-5xl">Where We&apos;ve Been</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-[#B8860B]/25 sm:left-1/2" />
          <div className="space-y-10">
            {MILESTONES.map((m, i) => (
              <div
                key={m.year}
                className={`relative flex items-start gap-6 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} sm:gap-0`}
              >
                <div className={`sm:w-1/2 ${i % 2 === 0 ? "sm:pr-12 sm:text-right" : "sm:pl-12"}`}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#B8860B]">{m.year}</p>
                    <p className="text-white/75">{m.desc}</p>
                  </div>
                </div>
                <div className="absolute left-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#B8860B]/50 bg-[#000d24] sm:left-1/2">
                  <Star className="h-3.5 w-3.5 text-[#B8860B]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Command staff */}
      <section className="bg-[#001a3d] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Command Staff</p>
          <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">Leadership</h2>
          <p className="mb-12 max-w-2xl text-lg text-white/65">
            Our officers are volunteers — Navy and Coast Guard veterans and professionals in the community who give up their Sundays because they believe in the program.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((l) => (
              <div key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#003087]/70 text-xl font-black text-white">
                  {l.initials}
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">{l.title}</p>
                <p className="mt-1 text-sm font-semibold text-white/80">{l.name}</p>
                <p className="mt-3 text-xs leading-relaxed text-white/55">{l.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo placeholder */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Unit Photos</p>
        <h2 className="mb-10 text-4xl font-black text-white sm:text-5xl">See Us in Action</h2>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-10 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/8">
            <Shield className="h-6 w-6 text-white/35" />
          </div>
          <p className="text-lg font-semibold text-white/55">Drill photos coming soon.</p>
          <p className="mt-2 text-sm text-white/35">Have photos from a past drill or training? Reach out. We would love to add them.</p>
        </div>
      </section>

      {/* CTA */}
      <div className="border-t border-white/5 bg-[#001233] px-6 py-16 text-center">
        <h2 className="mb-4 text-3xl font-black text-white">Come see us on a drill Sunday.</h2>
        <p className="mb-8 text-white/50">2nd and 4th Sunday every month. Reach out before your first visit so we can be ready for you.</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/join" className="flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 font-bold text-white shadow-lg hover:bg-[#9a7009]">
            <Users className="h-4 w-4" /> How to Join
          </Link>
          <Link href="/contact" className="flex items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 font-semibold text-white hover:bg-white/5">
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
