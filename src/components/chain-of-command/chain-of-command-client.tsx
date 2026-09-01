"use client";

import { Badge } from "@/components/ui/badge";
import { initials, roleLabel } from "@/lib/format";
import { Network } from "lucide-react";
import type { Billet, Profile } from "@/types/database";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role" | "billet">;
type BilletWithHolder = Billet & { holder: ProfileSnippet | null };

const ROLE_RING: Record<string, string> = {
  officer: "ring-2 ring-[#B8860B]",
  snco: "ring-2 ring-purple-400",
  nco: "ring-2 ring-amber-400",
  cadet: "ring-2 ring-blue-300",
};

const ROLE_BG: Record<string, string> = {
  officer: "bg-[#B8860B]",
  snco: "bg-purple-600",
  nco: "bg-amber-500",
  cadet: "bg-[#003087]",
};

function tierFor(sortOrder: number): number {
  if (sortOrder <= 1) return 0;
  if (sortOrder <= 3) return 1;
  if (sortOrder <= 7) return 2;
  return 3;
}

function BilletNode({ b, size = "md" }: { b: BilletWithHolder; size?: "lg" | "md" | "sm" }) {
  const h = b.holder;
  const avatarCls = size === "lg" ? "h-16 w-16 text-lg" : size === "md" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  return (
    <div className={`flex flex-col items-center gap-2 ${size === "sm" ? "w-32" : size === "md" ? "w-40" : "w-52"}`}>
      <div
        className={`relative flex items-center justify-center rounded-full font-bold text-white shadow-md ${avatarCls} ${h ? (ROLE_BG[h.role] ?? "bg-gray-400") : "bg-gray-200"} ${h ? (ROLE_RING[h.role] ?? "") : "ring-2 ring-dashed ring-gray-300"}`}
      >
        {h ? initials(h.full_name) : <Network className="h-4 w-4 text-gray-300" />}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{b.name}</p>
        {h ? (
          <>
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{h.full_name}</p>
            {h.rank && <p className="text-xs font-bold text-[#B8860B]">{h.rank}</p>}
            <Badge variant="outline" className="mt-0.5 text-[9px] px-1.5 py-0">{roleLabel(h.role)}</Badge>
          </>
        ) : (
          <Badge variant="outline" className="mt-0.5 text-[9px] px-1.5 py-0 text-gray-400">Vacant</Badge>
        )}
      </div>
    </div>
  );
}

function Connector({ direction = "v" }: { direction?: "v" | "h" }) {
  if (direction === "h") return <div className="h-px w-6 bg-gray-200" />;
  return <div className="w-px h-8 bg-gray-200" />;
}

export function ChainOfCommandClient({
  billets,
  profiles,
}: {
  billets: Billet[];
  profiles: ProfileSnippet[];
}) {
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const enriched: BilletWithHolder[] = billets
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({ ...b, holder: b.assigned_to ? (byId[b.assigned_to] ?? null) : null }));

  const tiers: BilletWithHolder[][] = [[], [], [], []];
  for (const b of enriched) {
    tiers[tierFor(b.sort_order)].push(b);
  }

  const filled = enriched.filter((b) => b.holder).length;

  if (enriched.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chain of Command</h1>
          <p className="mt-0.5 text-sm text-gray-400">No billets created yet.</p>
        </div>
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <Network className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm font-medium text-gray-400">Officers can add billets under the Billets section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chain of Command</h1>
        <p className="mt-0.5 text-sm text-gray-400">{filled} of {enriched.length} billets filled</p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-0">

          {/* Tier 0 — CO */}
          {tiers[0].length > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                {tiers[0].map((b, i) => (
                  <div key={b.id} className="flex items-center gap-4">
                    {i > 0 && <Connector direction="h" />}
                    <BilletNode b={b} size="lg" />
                  </div>
                ))}
              </div>
              {tiers[1].length > 0 && <Connector />}
            </div>
          )}

          {/* Tier 1 — Senior leadership */}
          {tiers[1].length > 0 && (
            <div className="flex flex-col items-center">
              {/* Horizontal rule spanning tier 1 */}
              {tiers[1].length > 1 && (
                <div
                  className="border-t border-gray-200"
                  style={{ width: `${(tiers[1].length - 1) * 176 + 160}px` }}
                />
              )}
              <div className="flex items-start gap-8">
                {tiers[1].map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    {tiers[1].length > 1 && <Connector />}
                    <BilletNode b={b} size="md" />
                  </div>
                ))}
              </div>
              {tiers[2].length > 0 && (
                <div className="mt-0 flex flex-col items-center">
                  <Connector />
                </div>
              )}
            </div>
          )}

          {/* Tier 2 — Department heads */}
          {tiers[2].length > 0 && (
            <div className="flex flex-col items-center">
              {tiers[2].length > 1 && (
                <div
                  className="border-t border-gray-200"
                  style={{ width: `${(tiers[2].length - 1) * 168 + 128}px` }}
                />
              )}
              <div className="flex items-start gap-6">
                {tiers[2].map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    {tiers[2].length > 1 && <Connector />}
                    <BilletNode b={b} size="md" />
                  </div>
                ))}
              </div>
              {tiers[3].length > 0 && <Connector />}
            </div>
          )}

          {/* Tier 3 — Section/squad leaders */}
          {tiers[3].length > 0 && (
            <div className="flex flex-col items-center">
              {tiers[3].length > 1 && (
                <div
                  className="border-t border-gray-200"
                  style={{ width: `${(tiers[3].length - 1) * 152 + 128}px` }}
                />
              )}
              <div className="flex flex-wrap items-start justify-center gap-4">
                {tiers[3].map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    {tiers[3].length > 1 && <Connector />}
                    <BilletNode b={b} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white px-4 py-3 text-xs text-gray-500">
        <span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Rank</span>
        {[
          { label: "Officer", cls: "bg-[#B8860B]" },
          { label: "SNCO", cls: "bg-purple-600" },
          { label: "NCO", cls: "bg-amber-500" },
          { label: "Cadet", cls: "bg-[#003087]" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full border border-dashed border-gray-300 bg-gray-100" />
          <span>Vacant</span>
        </div>
      </div>
    </div>
  );
}
