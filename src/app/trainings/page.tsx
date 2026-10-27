import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { TrainingsExplorer } from "./trainings-explorer";
import type { Category } from "./trainings-explorer";
import { createClient } from "@/lib/supabase/server";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";

export default async function TrainingsPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("trainings" as never)
    .select("*")
    .order("category_sort_order", { ascending: true })
    .order("sort_order", { ascending: true }) as { data: Array<{
      id: string; category: string; category_tagline: string; name: string;
      location: string; duration: string; overview: string;
      what_you_do: string[]; what_you_earn: string[]; who_its_for: string;
    }> | null };

  let categories: Category[] | undefined;
  if (rows && rows.length > 0) {
    const map = new Map<string, Category>();
    for (const r of rows) {
      if (!map.has(r.category)) {
        map.set(r.category, { title: r.category, tagline: r.category_tagline, trainings: [] });
      }
      map.get(r.category)!.trainings.push({
        name: r.name, location: r.location, duration: r.duration,
        overview: r.overview, whatYouDo: r.what_you_do,
        whatYouEarn: r.what_you_earn, whoItsFor: r.who_its_for,
      });
    }
    categories = Array.from(map.values());
  }

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      <section className="border-b border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">Annual Training</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            105+ trainings.<br />One week. Real military.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
            Once a year, every NSCC cadet chooses any training from a national catalog. Held at active military installations. These are not simulations. You train alongside professionals, earn real certifications, and go home changed.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <TrainingsExplorer categories={categories} />
        </div>
      </section>

      <div className="border-t border-white/5 bg-[#001233] px-6 py-14 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-lg font-semibold text-white">Want to earn a spot?</p>
          <p className="mt-2 text-white/45">You have to be an NSCC cadet first. Join the unit, complete Recruit Training, and the full catalog opens up.</p>
          <a
            href="/join"
            className="mt-6 inline-block rounded-full bg-[#B8860B] px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-[#9a7009]"
          >
            How to Join
          </a>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
