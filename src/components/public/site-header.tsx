import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UnitLogo } from "@/components/shared/unit-logo";
import { MobileNav } from "@/components/public/mobile-nav";
import { NavLinks } from "@/components/public/nav-links";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("unit_name")
    .eq("id", 1)
    .single();

  const unitName = settings?.unit_name ?? "Squadron 7-Zulu";

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#000d24]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <UnitLogo size={34} />
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8860B]">NSCC · SQ7-Z</p>
            <p className="text-sm font-bold leading-tight text-white">{unitName}</p>
          </div>
        </Link>

        <NavLinks />

        <div className="flex items-center gap-3">
          <Link
            href="/join"
            className="hidden text-sm font-medium text-white/55 transition-colors hover:text-white sm:block"
          >
            Join Now
          </Link>
          <Link
            href="/login"
            className="hidden items-center gap-1.5 rounded-full bg-[#B8860B] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009] md:flex"
          >
            Cadet Portal <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
