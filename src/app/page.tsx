import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Shield, Users, ChevronRight } from "lucide-react";
import { UnitLogo } from "@/components/shared/unit-logo";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  const unitName = settings?.unit_name ?? "Squadron 7-Zulu & TS Wasp";
  const motto = settings?.motto ?? "Honor, Courage, Commitment, Service";
  const logoUrl = settings?.logo_url;

  const values = motto.split(",").map((v: string) => v.trim());

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .eq("approved", true);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#001a4d]">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#003087]/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#B8860B]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)",
          }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <UnitLogo size={36} />
          <span className="hidden text-sm font-semibold text-white/70 sm:block">NSCC</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Register
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full bg-[#B8860B] px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-[#9a7009]"
          >
            Sign In <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo / anchor */}
        <div className="mb-8">
          {logoUrl ? (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#B8860B]/50 bg-[#003087]/60 ring-4 ring-[#B8860B]/20">
              <Image
                src={logoUrl}
                alt={`${unitName} logo`}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            </div>
          ) : (
            <UnitLogo size={112} />
          )}
        </div>

        {/* Label */}
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">
          U.S. Naval Sea Cadet Corps
        </p>

        {/* Unit name */}
        <h1 className="mb-4 max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
          {unitName}
        </h1>

        {/* Motto */}
        <p className="mb-10 max-w-xl text-lg italic text-white/60 sm:text-xl">
          &ldquo;{motto}&rdquo;
        </p>

        {/* Core values chips */}
        <div className="mb-12 flex flex-wrap justify-center gap-2">
          {values.map((v: string) => (
            <span
              key={v}
              className="rounded-full border border-[#B8860B]/40 bg-[#B8860B]/10 px-4 py-1.5 text-sm font-semibold text-[#B8860B]"
            >
              {v}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="flex min-w-[160px] items-center justify-center gap-2 rounded-full bg-[#B8860B] px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-[#9a7009] hover:shadow-xl"
          >
            <Shield className="h-4 w-4" />
            Member Login
          </Link>
          <Link
            href="/register"
            className="flex min-w-[160px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <Users className="h-4 w-4" />
            Join Our Unit
          </Link>
        </div>

        {/* Stats */}
        {(memberCount ?? 0) > 0 && (
          <div className="mt-16 flex items-center gap-8 text-center">
            <div>
              <p className="text-3xl font-extrabold text-white">{memberCount}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/40">
                Active Members
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-3xl font-extrabold text-white">NSCC</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-white/40">
                Excellence in Service
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom footer */}
      <div className="relative z-10 border-t border-white/5 px-6 py-4 text-center">
        <p className="text-xs text-white/25">
          Secured member portal &middot; {unitName} &middot; U.S. Naval Sea Cadet Corps
        </p>
      </div>
    </main>
  );
}
