import { CalendarDays, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { ContactForm } from "./contact-form";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

export default async function ContactPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Page hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Contact</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Get in Touch
          </h1>
          <p className="mt-5 max-w-2xl text-xl leading-relaxed text-white/55">
            Have questions about enrolling, our programs, or anything else? We are here. Send us a message and someone from our staff will get back to you quickly.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-14 lg:grid-cols-[1fr_420px] lg:items-start">

          {/* Form */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#B8860B]">Send a Message</p>
            <h2 className="mb-8 text-3xl font-black text-white">Send Us a Message</h2>
            <ContactForm />
          </div>

          {/* Info sidebar */}
          <div className="space-y-5 lg:pt-14">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#003087]/50">
                <CalendarDays className="h-5 w-5 text-[#B8860B]" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Drill Schedule</p>
              <p className="mt-2 text-lg font-bold text-white">2nd &amp; 4th Sunday</p>
              <p className="mt-1 text-sm text-white/50">Every month · 9:00 AM – 3:00 PM</p>
              <p className="mt-3 text-sm text-white/40">
                Reach out before your first visit — email us or fill out the interest form and we will confirm your drill date.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#003087]/50">
                <MapPin className="h-5 w-5 text-[#B8860B]" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#B8860B]">Location</p>
              <p className="mt-2 text-lg font-bold text-white">Quincy, Massachusetts</p>
              <p className="mt-1 text-sm text-white/50">Navy Operational Support Center</p>
              <p className="mt-1 text-sm text-white/50">or USS Salem</p>
              <p className="mt-3 text-sm text-white/40">Exact directions will be confirmed upon enrollment.</p>
            </div>

            <div className="rounded-2xl border border-[#B8860B]/15 bg-[#B8860B]/[0.04] p-6">
              <p className="text-sm font-bold text-white/80">Fastest Answer?</p>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Email us directly and someone from staff will get back to you before the next drill. Questions about cost, schedule, or enrollment are all welcome.
              </p>
              <p className="mt-3 text-sm font-semibold text-[#B8860B]">sq7z.nscc@gmail.com</p>
            </div>

            {/* Social / cadet portal call-out */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center">
              <p className="text-sm font-bold text-white">Already a Member?</p>
              <p className="mt-1 text-sm text-white/40">Log in to your Cadet Portal for training records, announcements, and more.</p>
              <a
                href="/login"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#003087] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#002266]"
              >
                Cadet Portal Login →
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
