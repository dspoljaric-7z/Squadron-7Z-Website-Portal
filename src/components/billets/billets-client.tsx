"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import {
  Award,
  Plus,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  X,
  Save,
  ChevronDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Billet, Profile } from "@/types/database";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role" | "avatar_url">;

type BilletWithHolder = Billet & {
  holder?: ProfileSnippet | null;
};

function enrichBillets(billets: Billet[], profiles: ProfileSnippet[]): BilletWithHolder[] {
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  return billets.map((b) => ({ ...b, holder: b.assigned_to ? byId[b.assigned_to] ?? null : null }));
}

function BilletModal({
  billet,
  profiles,
  onClose,
  onSaved,
}: {
  billet: BilletWithHolder | null;
  profiles: ProfileSnippet[];
  onClose: () => void;
  onSaved: (b: Billet) => void;
}) {
  const [name, setName] = useState(billet?.name ?? "");
  const [description, setDescription] = useState(billet?.description ?? "");
  const [duties, setDuties] = useState(billet?.duties ?? "");
  const [assignedTo, setAssignedTo] = useState(billet?.assigned_to ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Billet name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: me } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      duties: duties.trim() || null,
      assigned_to: assignedTo || null,
      assigned_by: assignedTo ? (me?.id ?? null) : null,
      assigned_at: assignedTo ? new Date().toISOString() : null,
    };

    let res;
    if (billet) {
      res = await supabase.from("billets").update(payload).eq("id", billet.id).select().single();
    } else {
      res = await supabase.from("billets").insert({ ...payload, active: true }).select().single();
    }

    if (res.error) {
      toast.error("Failed to save billet");
    } else {
      toast.success(billet ? "Billet updated" : "Billet created");
      onSaved(res.data as Billet);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">{billet ? "Edit Billet" : "New Billet"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Billet Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Supply Petty Officer"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of this billet…"
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Duties & Responsibilities</label>
            <textarea
              value={duties}
              onChange={(e) => setDuties(e.target.value)}
              placeholder="List specific responsibilities, one per line…"
              rows={4}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Assign to</label>
            <div className="relative">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              >
                <option value="">— Unassigned —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.rank ? `${p.rank} ` : ""}{p.full_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-2 bg-[#003087] hover:bg-[#002266]">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Billet"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BilletsClient({
  profile,
  initialBillets,
  allProfiles,
}: {
  profile: Profile;
  initialBillets: Billet[];
  allProfiles: ProfileSnippet[];
}) {
  const [billets, setBillets] = useState<BilletWithHolder[]>(enrichBillets(initialBillets, allProfiles));
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<BilletWithHolder | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isOfficer = profile.role === "officer";

  const filtered = billets.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.holder?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSaved = (saved: Billet) => {
    const enriched = enrichBillets([saved], allProfiles)[0];
    setBillets((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      return exists
        ? prev.map((b) => (b.id === saved.id ? enriched : b))
        : [...prev, enriched];
    });
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this billet?")) return;
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("billets").update({ active: false }).eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setBillets((prev) => prev.filter((b) => b.id !== id));
      toast.success("Billet removed");
    }
    setDeleting(null);
  };

  const assigned = filtered.filter((b) => b.assigned_to);
  const unassigned = filtered.filter((b) => !b.assigned_to);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003087]">Billets</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Unit positions and assigned responsibilities
          </p>
        </div>
        {isOfficer && (
          <Button
            onClick={() => setEditTarget("new")}
            className="gap-2 bg-[#003087] hover:bg-[#002266]"
          >
            <Plus className="h-4 w-4" /> New Billet
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search billets or members…"
          className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-[#003087]">{billets.length}</p>
          <p className="text-xs text-gray-400">Total Billets</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-green-600">{assigned.length}</p>
          <p className="text-xs text-gray-400">Filled</p>
        </div>
        <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-amber-500">{unassigned.length}</p>
          <p className="text-xs text-gray-400">Vacant</p>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white py-16 text-center">
          <Award className="mb-3 h-10 w-10 text-gray-200" />
          <p className="font-semibold text-gray-400">
            {search ? "No billets match your search" : "No billets defined yet"}
          </p>
          {isOfficer && !search && (
            <button
              onClick={() => setEditTarget("new")}
              className="mt-3 text-sm font-medium text-[#003087] hover:underline"
            >
              Create the first billet →
            </button>
          )}
        </div>
      )}

      {/* Assigned billets */}
      {assigned.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Filled Positions ({assigned.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assigned.map((b) => (
              <BilletCard
                key={b.id}
                billet={b}
                isOfficer={isOfficer}
                deleting={deleting === b.id}
                onEdit={() => setEditTarget(b)}
                onDelete={() => handleDelete(b.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Vacant billets */}
      {unassigned.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Vacant Positions ({unassigned.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map((b) => (
              <BilletCard
                key={b.id}
                billet={b}
                isOfficer={isOfficer}
                deleting={deleting === b.id}
                onEdit={() => setEditTarget(b)}
                onDelete={() => handleDelete(b.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      {editTarget !== null && (
        <BilletModal
          billet={editTarget === "new" ? null : editTarget}
          profiles={allProfiles}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function BilletCard({
  billet,
  isOfficer,
  deleting,
  onEdit,
  onDelete,
}: {
  billet: BilletWithHolder;
  isOfficer: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl border bg-white shadow-sm transition-all ${
        billet.holder ? "border-[#003087]/10" : "border-dashed border-gray-200"
      }`}
    >
      {/* Top color bar */}
      <div
        className={`h-1 w-full rounded-t-xl ${billet.holder ? "bg-[#003087]" : "bg-gray-200"}`}
      />
      <div className="flex flex-1 flex-col p-4">
        {/* Name + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award
              className={`h-4 w-4 shrink-0 ${billet.holder ? "text-[#B8860B]" : "text-gray-300"}`}
            />
            <h3 className="font-bold text-gray-800">{billet.name}</h3>
          </div>
          {isOfficer && (
            <div className="flex shrink-0 gap-1">
              <button
                onClick={onEdit}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-[#003087]/10 hover:text-[#003087]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {billet.description && (
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{billet.description}</p>
        )}

        {/* Duties (collapsible) */}
        {billet.duties && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-[#003087]/60 hover:text-[#003087]"
            >
              {expanded ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {expanded ? "Hide" : "View"} duties
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {billet.duties
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8860B]" />
                      {line.replace(/^[-•]\s*/, "")}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {/* Assigned member */}
        <div className="mt-auto pt-4">
          {billet.holder ? (
            <div className="flex items-center gap-2 rounded-lg bg-[#003087]/5 px-3 py-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#003087] text-xs text-white">
                  {initials(billet.holder.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#003087]">
                  {billet.holder.full_name}
                </p>
                {billet.holder.rank && (
                  <p className="text-xs text-[#B8860B]">{billet.holder.rank}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2">
              <User className="h-4 w-4 text-gray-300" />
              <p className="text-sm text-gray-300 italic">Vacant</p>
              {isOfficer && (
                <button
                  onClick={onEdit}
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-[#003087] hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Assign
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
