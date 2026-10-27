import Link from "next/link";
import { CalendarDays, MapPin, MessageCircle, Users, ArrowRight, CheckCircle } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { EnrollmentForm } from "./enrollment-form";
import { createClient } from "@/lib/supabase/server";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

export const metadata = {
  title: "How to Join | Squadron 7-Zulu",
  description: "Join Naval Sea Cadet Corps Squadron 7-Zulu in Quincy, MA. No military commitment required. Ages 10–18.",
};

const STEPS = [
  {
    step: "01",
    icon: MessageCircle,
    title: "Express Interest",
    desc: "Fill out the form below or email us. No commitment. We will get back to you before the next drill.",
    tip: "Tip: Fill out the form or email us first — we will make sure we are ready for you.",
  },
  {
    step: "02",
    icon: CalendarDays,
    title: "Attend a Drill",
    desc: "Come see us in action on the 2nd or 4th Sunday of any month. Drills run 9 AM to 3 PM at the Navy Operational Support Center in Quincy, MA. Bring a parent or guardian on your first visit.",
    tip: "Wear comfortable athletic clothing your first time. No uniform required yet.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Complete Your Enrollment",
    desc: "Once you decide to join, submit the enrollment application, medical history form, and parental consent. Our Yeoman handles the paperwork with you — nothing gets lost.",
    tip: "The Cadet Portal has a digital in-processing checklist so nothing gets missed.",
  },
  {
    step: "04",
    icon: Users,
    title: "Begin Training",
    desc: "Receive your initial rank, get your uniform, and start drilling. NSCC cadets begin preparing for Recruit Training. This is where it starts.",
    tip: "You will be assigned a sponsor cadet to help you get oriented.",
  },
];

const REQUIREMENTS = [
  { label: "Age", value: "NLCC: Ages 10 through 8th Grade · NSCC: 9th Grade through 18" },
  { label: "Citizenship", value: "Must be a U.S. citizen or lawful permanent resident" },
  { label: "Academics", value: "Must be enrolled in school (homeschool accepted) and in good academic standing" },
  { label: "Physical", value: "Basic physical health. A standard medical form is required from a physician." },
  { label: "Character", value: "No serious criminal history; minor infractions reviewed case by case" },
  { label: "Commitment", value: "Attend monthly drills (2nd & 4th Sunday) and participate in annual training" },
];

const BRING = [
  "A completed enrollment application (download below or fill out in person)",
  "Medical history form (we will provide this)",
  "A copy of your birth certificate or passport",
  "Proof of school enrollment",
  "Completed physical exam form (from your doctor)",
  "One parent or guardian (required for first drill)",
];

const FAQS = [
  { q: "Is there a cost to join?", a: "Annual membership is $375 for new cadets, $250 to renew. Uniforms are provided. Annual training runs about $300/week (room and board included). We never turn away a motivated cadet over finances — just ask." },
  { q: "Do we need military experience?", a: "No experience needed. We teach everything from scratch. Some of the best cadets here had never worn a uniform before." },
  { q: "What about homeschooled youth?", a: "Absolutely welcome. We require proof of school enrollment, which for homeschooled cadets is a letter from a parent verifying homeschool enrollment." },
  { q: "Is Sea Cadets year-round?", a: "Yes. Drills every month, national training in the summer. There is no off-season." },
  { q: "What if my cadet wants to stop?", a: "No long-term obligation. If it is not the right fit, you withdraw. No drama." },
];

export default async function JoinPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();
  const { data: faqData } = await supabase.from("public_faqs" as never).select("*").order("sort_order", { ascending: true });
  const dbFaqs = (faqData as { id: string; question: string; answer: string }[] | null) ?? [];
  const displayFaqs = dbFaqs.length > 0 ? dbFaqs : FAQS.map((f) => ({ id: f.q, question: f.q, answer: f.a }));

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Page hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Enrollment</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            How to Join
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-white/55">
            Four steps. Our Yeoman walks you through every piece of paperwork. Reach out first so we can be ready for you.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">The Process</p>
        <h2 className="mb-14 text-4xl font-black text-white sm:text-5xl">Four Steps to Join</h2>

        <div className="space-y-8">
          {STEPS.map((s, i) => (
            <div key={s.step} className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B8860B]/15 text-lg font-black text-[#B8860B]">
                  {s.step}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mt-12 hidden h-full w-px bg-white/5 lg:block" />
                )}
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-7">
                <div className="mb-4 flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-[#B8860B]" />
                  <h3 className="text-xl font-black text-white">{s.title}</h3>
                </div>
                <p className="mb-4 leading-relaxed text-white/55">{s.desc}</p>
                <div className="rounded-xl bg-[#B8860B]/8 px-4 py-2.5">
                  <p className="text-sm text-white/50">{s.tip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Drill info + Map */}
      <section className="bg-[#001233] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Find Us</p>
          <h2 className="mb-12 text-4xl font-black text-white sm:text-5xl">When &amp; Where We Meet</h2>

          <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-start">
            <div className="space-y-5">
              <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                  <CalendarDays className="h-6 w-6 text-[#B8860B]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Schedule</p>
                  <p className="mt-2 text-lg font-bold text-white">2nd &amp; 4th Sunday</p>
                  <p className="mt-1 text-white/55">Every month · 9:00 AM – 3:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                  <MapPin className="h-6 w-6 text-[#B8860B]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Primary Location</p>
                  <p className="mt-2 text-lg font-bold text-white">Navy Operational Support Center</p>
                  <p className="mt-1 text-white/55">100 Quincy Shore Drive, Quincy, MA 02169</p>
                  <a
                    href="https://maps.google.com/?q=100+Quincy+Shore+Drive+Quincy+MA+02169"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8860B] hover:underline"
                  >
                    Open in Google Maps <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#003087]/50">
                  <MessageCircle className="h-6 w-6 text-[#B8860B]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Questions?</p>
                  <p className="mt-2 text-lg font-bold text-white">Got a Question?</p>
                  <p className="mt-1 text-white/55">Show up to a drill or use our contact form. No question is too small.</p>
                </div>
              </div>
            </div>

            {/* Map embed */}
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title="Navy Operational Support Center Quincy MA"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2952.3!2d-71.0!3d42.27!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e37c5e7e69bbbb%3A0xf2e0a3c1c6e7da0!2sNavy%20Operational%20Support%20Center%20Quincy!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="360"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Eligibility</p>
            <h2 className="mb-8 text-4xl font-black text-white sm:text-5xl">Requirements</h2>
            <div className="space-y-4">
              {REQUIREMENTS.map((r) => (
                <div key={r.label} className="flex items-start gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B8860B]/20 text-[10px] font-black text-[#B8860B]">✓</span>
                  <div>
                    <p className="text-sm font-bold text-white">{r.label}</p>
                    <p className="text-sm text-white/45">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">First Drill</p>
            <h2 className="mb-8 text-4xl font-black text-white sm:text-5xl">What to Bring</h2>
            <div className="space-y-3">
              {BRING.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-white/60">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8860B]/60" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-[#B8860B]/15 bg-[#B8860B]/[0.04] p-5">
              <p className="text-sm leading-relaxed text-white/60">
                <strong className="text-white/80">Don&apos;t have everything on your first visit?</strong> That is completely okay. Just come, meet the team, and see what Sea Cadets is about. We will figure out the paperwork together.
              </p>
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
            {displayFaqs.map((faq) => (
              <div key={faq.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                <h3 className="mb-3 font-bold text-white">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-white/55">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enrollment form */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Get Started</p>
        <h2 className="mb-3 text-4xl font-black text-white sm:text-5xl">Express Interest</h2>
        <p className="mb-10 max-w-xl text-lg text-white/45">
          Fill this out and we&apos;ll reach out to confirm your first drill date and make sure we&apos;re ready for you.
        </p>
        <EnrollmentForm />
        <p className="mt-6 text-center text-sm text-white/25">
          Questions? Email us or show up on a drill Sunday. 2nd &amp; 4th Sunday · 9 AM · Quincy, MA
        </p>
      </section>

      {/* Final CTA */}
      <div className="border-t border-white/5 px-6 py-16 text-center">
        <h2 className="mb-4 text-3xl font-black text-white">Questions first?</h2>
        <p className="mb-8 text-white/50">Email us, fill out the form, or just show up on a drill Sunday.</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/contact" className="flex items-center gap-2 rounded-full bg-[#B8860B] px-8 py-3.5 font-bold text-white shadow-lg hover:bg-[#9a7009]">
            <MessageCircle className="h-4 w-4" /> Contact Us
          </Link>
          <Link href="/parents" className="flex items-center gap-2 rounded-full border border-white/15 px-8 py-3.5 font-semibold text-white hover:bg-white/5">
            For Parents <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
