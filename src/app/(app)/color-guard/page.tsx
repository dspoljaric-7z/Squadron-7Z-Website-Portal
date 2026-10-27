import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { initials } from "@/lib/format";

export default async function ColorGuardPage() {
  await requireProfile();
  const supabase = await createClient();
  const admin = createAdminClient();

  // Get all cadets with Color Guard = completed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quals } = await (admin.from("qualifications") as any)
    .select("cadet_id, status, updated_at")
    .eq("qual_type", "Color Guard")
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  const cadetIds: string[] = (quals ?? []).map((q: { cadet_id: string }) => q.cadet_id);

  let cadets: { id: string; full_name: string; rank: string | null; billet: string | null; division_id: string | null }[] = [];
  if (cadetIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, rank, billet, division_id")
      .in("id", cadetIds)
      .eq("active", true)
      .order("full_name");
    cadets = (data ?? []) as typeof cadets;
  }

  // Get divisions for display
  const { data: divisions } = await supabase.from("divisions").select("id, name");
  const divMap = Object.fromEntries((divisions ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-[#003087]" />
        <div>
          <h1 className="text-2xl font-bold text-[#003087]">Color Guard</h1>
          <p className="text-sm text-gray-500">Cadets certified for Color Guard</p>
        </div>
      </div>

      {cadets.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">No certified cadets yet</p>
          <p className="text-sm mt-1">Mark Color Guard as &ldquo;completed&rdquo; in the Qualifications page to add members here.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100">
          <div className="px-4 py-2 flex items-center justify-between bg-gray-50 rounded-t-lg">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {cadets.length} certified member{cadets.length !== 1 ? "s" : ""}
            </span>
          </div>
          {cadets.map((c) => (
            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#003087] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials(c.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{c.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {c.rank && <span className="text-xs text-gray-500">{c.rank}</span>}
                  {c.division_id && divMap[c.division_id] && (
                    <span className="text-xs text-gray-400">{divMap[c.division_id]}</span>
                  )}
                  {c.billet && <span className="text-xs text-gray-400">{c.billet}</span>}
                </div>
              </div>
              <Badge className="bg-[#003087]/10 text-[#003087] border-[#003087]/20 text-xs">Certified</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
