import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

const NLCC_RANKS = [
  { rank: "Recruit", abbr: "RC", desc: "Entry level, starting point" },
  { rank: "Apprentice Cadet", abbr: "APC", desc: "After first Polaris coursework and PRT" },
  { rank: "Able Cadet", abbr: "ABC", desc: "After APC curriculum completion" },
  { rank: "Petty Officer 3rd Class", abbr: "PO3", desc: "First leadership rank" },
  { rank: "Petty Officer 2nd Class", abbr: "PO2", desc: "Division leadership" },
  { rank: "Petty Officer 1st Class", abbr: "PO1", desc: "Senior League Cadet leadership" },
  { rank: "Ship's Leading Petty Officer", abbr: "SLPO", desc: "Top League Cadet billet, age 12½+" },
];

const NSCC_RANKS = [
  { rank: "Seaman Recruit", abbr: "SR", desc: "Entry level, starting point" },
  { rank: "Seaman Apprentice", abbr: "SA", desc: "After SR Polaris coursework" },
  { rank: "Seaman", abbr: "SN", desc: "After Recruit Training (bootcamp)" },
  { rank: "Petty Officer 3rd Class", abbr: "PO3", desc: "First leadership rank; PRT + coursework" },
  { rank: "Petty Officer 2nd Class", abbr: "PO2", desc: "Division leadership; PO Leadership Academy" },
  { rank: "Petty Officer 1st Class", abbr: "PO1", desc: "Senior enlisted; PO1 Board + CO approval" },
  { rank: "Chief Petty Officer", abbr: "CPO", desc: "Highest rank; Chief Board + national approval" },
];

const FAQS = [
  {
    q: "Do I have to join the military after Sea Cadets?",
    a: "No. Sea Cadets is a civilian youth program. Some alumni go military. Most go to college, trade school, or straight into careers. There is no obligation either way.",
  },
  {
    q: "What is Recruit Training (bootcamp)?",
    a: "After joining NSCC, cadets attend a nine-day Recruit Training with hundreds of other New England cadets. Nine days of drill, PT, classroom instruction, and practical testing. It is hard. Most cadets say it was the best thing they have done.",
  },
  {
    q: "How do annual trainings work?",
    a: "Once per year after Recruit Training, each NSCC cadet picks any training from a national catalog of 105+ options. One week at a real military installation — aviation, SCUBA, medicine, special ops, and more. You choose what interests you.",
  },
  {
    q: "Can I participate in multiple programs?",
    a: "Yes. NLCC cadets who enter 9th grade can transfer directly into NSCC. Rank carries over — you pick up where you left off.",
  },
  {
    q: "Is there a cost to participate?",
    a: "Annual membership is $375 for new cadets, $250 to renew. Siblings get a reduced rate ($250 new, $125 renewal). Uniforms are provided. Annual training runs about $300 per week (room and board included, travel separate). We have never turned away a cadet over money — if cost is a concern, just ask.",
  },
];

export default async function ProgramsPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Page hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Programs</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Navy League Cadets.<br />Sea Cadets.
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-white/55">
            10 years old getting started, or 17 and ready for bootcamp — there is a track for where you are right now.
          </p>
        </div>
      </section>

      {/* NLCC Section */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#003087] bg-[#003087]/30 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#B8860B]">
          NLCC · Junior Program
        </div>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">Navy League Cadet Corps</h2>
            <p className="mb-3 text-lg font-semibold text-[#B8860B]">Ages 10 through 8th Grade</p>
            <p className="mb-6 text-lg leading-relaxed text-white/55">
              NLCC is the junior program. It is where younger cadets get their footing — seamanship, military customs, and the basics of how a unit operates. The standards are real. The uniform goes on the right way. And the older cadets expect you to know your stuff.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/55">
              NLCC cadets attend monthly drills alongside NSCC members and participate in a one-week orientation course away from home. Their first taste of independent military-style training.
            </p>
            <div className="space-y-3">
              {["Monthly drills, 2nd & 4th Sunday, 9 AM to 3 PM", "Basic seamanship, knots, and nautical knowledge", "Military customs, courtesies, and uniform wear", "Introduction to leadership and team roles", "One-week orientation course (sleep-away)", "Physical fitness and wellness standards", "Community service projects in the Quincy area"].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-white/60">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#003087]/50 text-[10px] font-black text-[#B8860B]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">NLCC Rank Progression</p>
            <div className="space-y-2">
              {NLCC_RANKS.map((r, i) => (
                <div key={r.abbr} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003087]/50 text-[11px] font-black text-[#B8860B]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{r.rank}</p>
                    <p className="text-xs text-white/35">{r.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40">{r.abbr}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-[#B8860B]/15 bg-[#B8860B]/[0.04] p-5">
              <p className="text-sm text-white/60">
                <strong className="text-white/80">Transition to NSCC:</strong> When a League Cadet enters 9th grade, they become eligible to transfer into NSCC. Rank earned in NLCC transfers. You pick up where you left off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NSCC Section */}
      <section className="bg-[#001233] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B8860B]/40 bg-[#B8860B]/15 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#B8860B]">
            NSCC · Full Rigor Program
          </div>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="mb-4 text-4xl font-black text-white sm:text-5xl">Naval Sea Cadet Corps</h2>
              <p className="mb-3 text-lg font-semibold text-[#B8860B]">9th Grade through Age 18</p>
              <p className="mb-6 text-lg leading-relaxed text-white/55">
                NSCC is the full program. The standards are higher, the responsibilities are real, and the annual trainings run at actual military installations — aviation, SCUBA, special operations, medicine, and more.
              </p>
              <div className="mb-6 rounded-2xl border border-[#B8860B]/20 bg-[#B8860B]/[0.05] p-5">
                <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[#B8860B]">Recruit Training</p>
                <p className="text-sm leading-relaxed text-white/65">
                  Within the first year, NSCC cadets attend a <strong className="text-white/85">nine-day Recruit Training</strong> (bootcamp) alongside hundreds of other New England cadets at a regional military installation. Structured in lecture, demonstration, drill, and practical testing, it is the defining milestone of every cadet&apos;s early career.
                </p>
              </div>
              <div className="space-y-3">
                {["All NLCC activities, at an advanced level", "Recruit Training bootcamp at a regional military installation", "Annual training of your choice from 105+ options nationwide", "Rank advancement through enlisted and officer tracks", "Division leadership responsibilities", "College scholarship applications and support", "Military academy nomination assistance", "National leadership competitions"].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#B8860B]/20 text-[10px] font-black text-[#B8860B]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">NSCC Enlisted Rank Progression</p>
              <div className="space-y-2">
                {NSCC_RANKS.map((r, i) => (
                  <div key={r.abbr} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B8860B]/15 text-[11px] font-black text-[#B8860B]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">{r.rank}</p>
                      <p className="text-xs text-white/35">{r.desc}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40">{r.abbr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#001233] px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">FAQ</p>
          <h2 className="mb-12 text-4xl font-black text-white sm:text-5xl">Common Questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <h3 className="mb-3 font-bold text-white">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-white/55">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="border-t border-white/5 px-6 py-16 text-center">
        <h2 className="mb-4 text-3xl font-black text-white">Ready to Start?</h2>
        <p className="mb-8 text-white/50">Find out which program is right for you.</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/join" className="flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 font-bold text-white shadow-lg hover:bg-[#9a7009]">
            <Users className="h-4 w-4" /> How to Join
          </Link>
          <Link href="/contact" className="flex items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 font-semibold text-white hover:bg-white/5">
            Ask a Question <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
