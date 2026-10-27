import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteHeader } from "@/components/public/site-header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Compass className="h-8 w-8 text-[#B8860B]" />
        </div>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.25em] text-[#B8860B]">404 — Not Found</p>
        <h1 className="mt-3 text-5xl font-black leading-tight text-white sm:text-6xl">
          Off course.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/45">
          This page doesn&apos;t exist or may have been moved. Use the navigation above or return to the home page.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-[#B8860B] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009]"
          >
            Return Home
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Contact Us
          </Link>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-white/25">
          <Link href="/about" className="transition-colors hover:text-white/50">About</Link>
          <Link href="/programs" className="transition-colors hover:text-white/50">Programs</Link>
          <Link href="/trainings" className="transition-colors hover:text-white/50">Trainings</Link>
          <Link href="/join" className="transition-colors hover:text-white/50">Join</Link>
          <Link href="/login" className="transition-colors hover:text-white/50">Cadet Portal</Link>
        </div>
      </main>
    </div>
  );
}
