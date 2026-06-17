"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, roleLabel } from "@/lib/format";
import { Network } from "lucide-react";
import type { Billet, Profile } from "@/types/database";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role" | "billet">;
type BilletWithHolder = Billet & { holder: ProfileSnippet | null };

const ROLE_DOT: Record<string, string> = {
  officer: "bg-[#B8860B]",
  snco: "bg-purple-500",
  nco: "bg-amber-400",
  cadet: "bg-blue-400",
};

const ROLE_AVATAR: Record<string, string> = {
  officer: "bg-[#B8860B]",
  snco: "bg-purple-600",
  nco: "bg-amber-500",
  cadet: "bg-[#003087]",
};

export function ChainOfCommandClient({
  billets,
  profiles,
}: {
  billets: Billet[];
  profiles: ProfileSnippet[];
}) {
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const enriched: BilletWithHolder[] = billets.map((b) => ({
    ...b,
    holder: b.assigned_to ? (byId[b.assigned_to] ?? null) : null,
  }));

  const filled = enriched.filter((b) => b.holder);
  const vacant = enriched.filter((b) => !b.holder);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chain of Command</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          {filled.length} of {enriched.length} billets filled
        </p>
      </div>

      {enriched.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center">
          <Network className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm font-medium text-gray-400">No billets created yet.</p>
          <p className="mt-1 text-xs text-gray-300">Officers can add billets under the Billets section.</p>
        </div>
      )}

      {filled.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filled.map((b) => {
            const h = b.holder!;
            return (
              <div
                key={b.id}
                className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {b.name}
                </p>
                {b.description && (
                  <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{b.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        className={`text-sm font-bold text-white ${ROLE_AVATAR[h.role] ?? "bg-gray-400"}`}
                      >
                        {initials(h.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${ROLE_DOT[h.role] ?? "bg-gray-400"}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{h.full_name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {h.rank && (
                        <span className="text-xs font-bold text-[#B8860B]">{h.rank}</span>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {roleLabel(h.role)}
                      </Badge>
                    </div>
                    {h.billet && (
                      <p className="mt-0.5 text-xs text-gray-400 truncate">{h.billet}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vacant.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Vacant Billets
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vacant.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-dashed bg-white/50 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-200">
                  <Network className="h-4 w-4 text-gray-300" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-500">{b.name}</p>
                  {b.description && (
                    <p className="text-xs text-gray-300 truncate">{b.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto shrink-0 text-[10px] text-gray-400">
                  Vacant
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
