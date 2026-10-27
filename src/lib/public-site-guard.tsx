import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export async function checkPublicSiteEnabled(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("public_site_enabled").eq("id", 1).single();
  return (data as { public_site_enabled?: boolean } | null)?.public_site_enabled ?? true;
}

export function SiteOfflinePage() {
  return (
    <div className="min-h-screen bg-[#000d24] text-white flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-5xl font-bold text-[#C5A028] mb-4">Under Construction</p>
          <p className="text-lg text-gray-300 max-w-md mx-auto">
            This page is not currently available. Please check back soon.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
