import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Users } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

const VIDEO_SRC = "https://www.7zulu.org/uploads/b/144616394-280835126384184489/_recruiting_video__2__367.mp4";
const VIDEO_POSTER = "https://www.7zulu.org/uploads/b/144616394-280835126384184489/_recruiting_video__2__367.jpg";

const TRAINING_DOMAINS = [
  "Medical & EMT",
  "Aviation",
  "SCUBA & Dive Ops",
  "Special Operations",
  "STEM & Robotics",
  "Music Corps",
  "Seamanship",
  "Leadership",
  "Culinary Arts",
  "Journalism & Film",
  "Color Guard",
  "Cybersecurity",
];

export default async function LandingPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .eq("approved", true);

  const activeCount = memberCount || 40;

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative h-[92vh] min-h-[560px] overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={VIDEO_POSTER}
          className="absolute inset-0 h-full w-full object-cover object-center"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#000d24]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000d24] via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-14 sm:px-14 lg:px-24">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              NSCC &amp; NLCC · Squadron 7-Zulu · Quincy, MA
            </p>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Naval Sea Cadet Corps<br />
              <span className="text-[#B8860B]">Squadron 7-Zulu</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
              A structured, serious program for youth ages 10–18. Cadets earn rank, attend national trainings at military installations, and build a record that holds up — no commitment to serve required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/join"
                className="rounded-full bg-[#B8860B] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#9a7009]"
              >
                How to Join
              </Link>
              <Link
                href="/programs"
                className="rounded-full border border-white/25 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── ABOUT ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-28 sm:px-14 lg:px-24">
        <div className="grid gap-16 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <h2 className="mb-7 text-4xl font-black leading-tight text-white sm:text-5xl">
              Rank is earned.<br />
              So is everything else.
            </h2>
            <p className="mb-5 text-lg leading-relaxed text-white/70">
              Squadron 7-Zulu is a Naval Sea Cadet Corps unit out of Quincy, Massachusetts. Sponsored by the Navy League of the United States and backed by the U.S. Navy and Coast Guard — this is a real program, run the right way, for kids who want something to show for their time.
            </p>
            <p className="mb-8 text-lg leading-relaxed text-white/70">
              Cadets earn rank, hold leadership billets, attend national trainings at military installations across the country, and build a record that holds up on college applications and military academy nominations. No obligation to serve, ever.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#B8860B] hover:underline"
            >
              About our unit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-0 border-l border-white/10 pl-8">
            {[
              { value: `${activeCount}+`, label: "Active cadets" },
              { value: "105+", label: "Annual training options" },
              { value: "Ages 10–18", label: "Open enrollment" },
              { value: "Every 2nd & 4th Sunday", label: "Monthly drills" },
            ].map((s, i) => (
              <div key={s.label} className={`py-6 ${i < 3 ? "border-b border-white/8" : ""}`}>
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="mt-1 text-sm text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ─────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-28 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <h2 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                Junior program.<br />Full program.
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-white/65 lg:text-right">
              One program for younger cadets getting started. One for high schoolers ready for the full thing.
            </p>
          </div>

          <div className="grid gap-px bg-white/5 sm:grid-cols-2">
            {/* NLCC */}
            <div className="bg-[#001233] p-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/45">NLCC</p>
              <h3 className="mb-1 text-2xl font-black text-white">Navy League Cadet Corps</h3>
              <p className="mb-6 text-[#B8860B]">Ages 10 – 8th Grade</p>
              <p className="mb-8 leading-relaxed text-white/65">
                Our junior program introduces seamanship, military customs, and team leadership in a structured setting. Monthly drills, a one-week sleep-away orientation, and a tight-knit squad to grow with.
              </p>
              <Link href="/programs" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#B8860B]">
                Program details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* NSCC */}
            <div className="bg-[#001233] p-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/45">NSCC</p>
              <h3 className="mb-1 text-2xl font-black text-white">Naval Sea Cadet Corps</h3>
              <p className="mb-6 text-[#B8860B]">9th Grade – Age 18</p>
              <p className="mb-8 leading-relaxed text-white/65">
                The full program. A nine-day Recruit Training bootcamp kicks things off. From there, cadets advance in rank, choose from 105+ national trainings, lead divisions, and compete for scholarships and military academy nominations.
              </p>
              <Link href="/programs" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#B8860B]">
                Program details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRAINING ─────────────────────────────────────────── */}
      <section className="px-6 py-28 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-2xl">
            <h2 className="mb-5 text-4xl font-black leading-tight text-white sm:text-5xl">
              105+ national trainings<br />to choose from.
            </h2>
            <p className="text-lg leading-relaxed text-white/65">
              Once a year, every NSCC cadet selects a one-week training from a national catalog. Programs run at real military installations — aviation, SCUBA, medicine, special operations, cybersecurity, and more. Fully staffed by active-duty military and Sea Cadet officers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {TRAINING_DOMAINS.map((d) => (
              <span
                key={d}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70"
              >
                {d}
              </span>
            ))}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/35">
              + dozens more
            </span>
          </div>
        </div>
      </section>

      {/* ── FOR PARENTS ──────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">For Parents</p>
              <h2 className="mb-4 text-3xl font-black text-white sm:text-4xl">Your questions, answered.</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { q: "Does joining commit my child to military service?", a: "No. There is zero obligation to serve, now or ever." },
                  { q: "What does it cost?", a: "Annual membership is $375 for new cadets, $250 to renew. Uniforms are provided. Annual training runs about $300 per week (room and board included, travel separate)." },
                  { q: "Who supervises the cadets?", a: "Adult officers who have passed background checks through the Navy League." },
                  { q: "What will my child get out of it?", a: "Rank, certifications, leadership experience, and a record that stands out on college applications." },
                ].map((item) => (
                  <div key={item.q} className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                    <p className="mb-2 text-sm font-bold text-white">{item.q}</p>
                    <p className="text-sm leading-relaxed text-white/65">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <Link
                href="/parents"
                className="inline-flex items-center gap-2 rounded-full bg-white/8 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/12"
              >
                Full parent guide <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-28 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-14 text-4xl font-black text-white sm:text-5xl">In their words.</h2>

          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                quote: "The opportunities I've had to lead my shipmates and speak in front of others has greatly improved my confidence and initiative.",
                name: "Evan F.",
                detail: "Age 17, NSCC",
              },
              {
                quote: "I've watched my cadet grow into a leader, taking on challenges with determination and learning the value of service and perseverance.",
                name: "Madeline F.",
                detail: "Parent",
              },
              {
                quote: "My son has matured so much since he joined. It gave him purpose — discipline, organization, punctuality, and real appreciation.",
                name: "Diana R.",
                detail: "Parent",
              },
            ].map((t) => (
              <div key={t.name}>
                <blockquote className="mb-6 text-lg leading-relaxed text-white/75">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="mt-0.5 text-xs text-white/50">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN ─────────────────────────────────────────────── */}
      <section className="px-6 py-28 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-7 text-4xl font-black leading-tight text-white sm:text-5xl">
                Ready to start?
              </h2>
              <p className="mb-5 text-lg leading-relaxed text-white/70">
                We drill on the 2nd and 4th Sunday of every month, 9 AM to 3 PM, at the Navy Operational Support Center in Quincy, MA. Reach out before your first visit so we can be ready for you.
              </p>
              <p className="mb-10 text-lg leading-relaxed text-white/70">
                Our Yeoman team handles the paperwork side. Your job is just to show up ready to work.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/join"
                  className="inline-flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#9a7009]"
                >
                  <Users className="h-4 w-4" />
                  Enrollment Guide
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/5"
                >
                  Ask a Question
                </Link>
              </div>
            </div>

            <div className="space-y-5 border-l border-white/8 pl-12">
              {[
                { label: "When", value: "2nd & 4th Sunday, 9 AM to 3 PM" },
                { label: "Where", value: "Navy Operational Support Center, Quincy MA\nor USS Salem" },
                { label: "Ages", value: "10 through 18" },
                { label: "Cost", value: "$375 new membership · $250 renewal\nUniforms provided · Training ~$300/week" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[80px_1fr] gap-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-white/45">{row.label}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
