import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { checkPublicSiteEnabled, SiteOfflinePage } from "@/lib/public-site-guard";
import { AlumniSubmitForm } from "./alumni-submit-form";

type AlumniRow = {
  id: string;
  name: string;
  years: string;
  rank: string;
  now_position: string;
  detail: string;
  trainings: string[];
  sort_order: number;
};

const FALLBACK_ALUMNI: AlumniRow[] = [
  { id: "1", name: "Michael T.", years: "2016 – 2020", rank: "Chief Petty Officer", now_position: "U.S. Naval Academy, Class of 2026", detail: "Earned his CPO rank and attended SCUBA training in Key West before receiving a nomination to the Naval Academy. Currently studying aerospace engineering.", trainings: ["SCUBA Diving", "Leadership Academy", "Naval Science"], sort_order: 1 },
  { id: "2", name: "Aisha W.", years: "2018 – 2022", rank: "Petty Officer First Class", now_position: "Boston University — Nursing, Class of 2026", detail: "Completed EMT certification through Sea Cadets and attended the Medical training program at the National Naval Medical Center. Credited Sea Cadets as the reason she pursued nursing.", trainings: ["EMT Certification", "Medical Training", "Recruit Training"], sort_order: 2 },
  { id: "3", name: "Devon R.", years: "2015 – 2019", rank: "Chief Petty Officer", now_position: "U.S. Coast Guard, Active Duty", detail: "Earned CPO, the highest NSCC cadet rank, in his final year. Used Sea Cadet experience to advance quickly in Coast Guard basic training. Now stationed in Boston.", trainings: ["Seamanship", "Special Operations", "Junior Officer Leadership"], sort_order: 3 },
  { id: "4", name: "Priya S.", years: "2019 – 2023", rank: "Petty Officer Second Class", now_position: "MIT — Computer Science & Engineering", detail: "Participated in STEM and Cybersecurity trainings through the NSCC program. Applied to MIT with Sea Cadet rank advancement and community service record as central parts of her application.", trainings: ["Cybersecurity Operations", "STEM & Robotics", "Recruit Training"], sort_order: 4 },
];

export const metadata = {
  title: "Alumni | Squadron 7-Zulu",
  description: "Where are they now? Naval Sea Cadet Corps Squadron 7-Zulu alumni at service academies, top universities, and active military.",
};

export default async function AlumniPage() {
  if (!await checkPublicSiteEnabled()) return <SiteOfflinePage />;
  const supabase = await createClient();
  const { data } = await supabase.from("public_alumni" as never).select("*").order("sort_order", { ascending: true });
  const alumni = ((data as AlumniRow[] | null) ?? []).length > 0 ? (data as AlumniRow[]) : FALLBACK_ALUMNI;

  return (
    <div className="min-h-screen bg-[#000d24] text-white">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-white/5 bg-[#001233] px-6 py-20 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">Alumni</p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
            Where they are now.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/55">
            Service academies, top universities, active military, and civilian careers. The through-line is always the same: Sea Cadets built the foundation.
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="border-b border-white/5 px-6 py-10 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-4">
            {[
              { value: "2", label: "Service academy alumni" },
              { value: "6+", label: "4-year university alumni" },
              { value: "3+", label: "Active duty military" },
              { value: "100%", label: "College enrollment rate" },
            ].map((s, i) => (
              <div key={s.label} className={`border-l border-white/10 pl-5 ${i === 0 ? "border-l-[#B8860B]/40" : ""}`}>
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="mt-1 text-sm text-white/35">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/20">Based on known alumni outcomes. This page will grow as more alumni share their stories.</p>
        </div>
      </div>

      {/* Alumni profiles */}
      <section className="px-6 py-24 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-8 md:grid-cols-2">
            {alumni.map((a) => (
              <div key={a.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black text-white">{a.name}</p>
                    <p className="mt-0.5 text-sm text-white/40">{a.rank} · {a.years}</p>
                  </div>
                  <div className="shrink-0 rounded-full bg-[#003087]/50 px-3 py-1 text-xs font-bold text-[#B8860B]">
                    Alumni
                  </div>
                </div>

                <div className="mb-4 rounded-xl bg-[#B8860B]/8 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#B8860B]">Now</p>
                  <p className="mt-1 text-sm font-semibold text-white">{a.now_position}</p>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-white/50">{a.detail}</p>

                {a.trainings.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/25">Trainings Attended</p>
                    <div className="flex flex-wrap gap-2">
                      {a.trainings.map((t) => (
                        <span key={t} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/45">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-white/25">
            Names are anonymized pending alumni consent. Stories are based on real cadet outcomes.
          </p>
        </div>
      </section>

      {/* Submit story */}
      <section className="border-t border-white/5 bg-[#001233] px-6 py-24 sm:px-14 lg:px-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-3 text-3xl font-black text-white">Are you an alumnus?</h2>
          <p className="mb-10 text-lg text-white/50">
            Share where you are now. We will feature your story here to inspire the next generation of cadets.
          </p>
          <AlumniSubmitForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
