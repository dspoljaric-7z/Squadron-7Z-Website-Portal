import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UnitLogo } from "@/components/shared/unit-logo";

export async function SiteFooter() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("unit_name")
    .eq("id", 1)
    .single();

  const unitName = settings?.unit_name ?? "Squadron 7-Zulu";

  return (
    <footer className="border-t border-white/5 bg-[#000812] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <UnitLogo size={42} />
            <div>
              <p className="font-bold text-white">{unitName}</p>
              <p className="text-xs text-white/30">U.S. Naval Sea Cadet Corps</p>
            </div>
          </Link>

          <div className="flex flex-col items-center gap-4 sm:items-end">
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/35">
              <Link href="/about" className="transition-colors hover:text-white/70">About</Link>
              <Link href="/programs" className="transition-colors hover:text-white/70">Programs</Link>
              <Link href="/join" className="transition-colors hover:text-white/70">Join</Link>
              <Link href="/contact" className="transition-colors hover:text-white/70">Contact</Link>
              <span className="text-white/10">|</span>
              <Link href="/safety" className="transition-colors hover:text-white/70">Safety Policy</Link>
              <Link href="/privacy" className="transition-colors hover:text-white/70">Privacy</Link>
              <span className="text-white/10">|</span>
              <Link href="/login" className="transition-colors hover:text-white/70">Cadet Portal</Link>
              <Link href="/register" className="transition-colors hover:text-white/70">Enroll</Link>
            </nav>
            <p className="text-xs text-white/20">Quincy, Massachusetts</p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-8 text-center text-xs text-white/18">
          Sponsored by the Navy League of the United States · Supported by the U.S. Navy &amp; U.S. Coast Guard
        </div>
      </div>
    </footer>
  );
}
