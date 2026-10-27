"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.25em] text-red-400">System Error</p>
        <h1 className="mt-3 text-5xl font-black leading-tight text-white sm:text-6xl">
          Something broke.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-white/45">
          An unexpected error occurred. Try again — if it keeps happening, contact a Squadron Officer.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-white/20">Error ref: {error.digest}</p>
        )}

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="rounded-full bg-[#B8860B] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009]"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
