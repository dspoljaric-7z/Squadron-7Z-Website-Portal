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
  Send,
  ClipboardList,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Billet, Profile } from "@/types/database";
import type { BilletApplication } from "@/app/(app)/billets/page";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role" | "avatar_url">;

type BilletWithHolder = Billet & {
  holder?: ProfileSnippet | null;
};

function NominateDialog({
  billet,
  profiles,
  onClose,
}: {
  billet: BilletWithHolder;
  profiles: ProfileSnippet[];
  onClose: () => void;
}) {
  const [cadetId, setCadetId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!cadetId) return;
    setSaving(true);
    const supabase = createClient();
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
    const { error } = await supabase.from("billet_nominations").insert({
      cadet_id: cadetId,
      billet_id: billet.id,
      billet_name: billet.name,
      stage: "nominated",
      nominated_by: me?.id ?? null,
      notes: notes.trim() || null,
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Nomination submitted for ${billet.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-800">Nominate for Billet</h2>
            <p className="text-xs text-gray-400">{billet.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Cadet *</label>
            <div className="relative">
              <select
                value={cadetId}
                onChange={(e) => setCadetId(e.target.value)}
                className="w-full appearance-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              >
                <option value="">— Select cadet —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.rank ? `${p.rank} ` : ""}{p.full_name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for nomination, qualifications, etc."
              rows={3}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !cadetId} className="gap-1.5 bg-[#003087] hover:bg-[#002266]">
            <Send className="h-3.5 w-3.5" />
            {saving ? "Submitting…" : "Nominate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function enrichBillets(billets: Billet[], profiles: ProfileSnippet[]): BilletWithHolder[] {
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  return billets.map((b) => ({ ...b, holder: b.assigned_to ? byId[b.assigned_to] ?? null : null }));
}

const BILLET_TYPE_OPTIONS = [
  { value: "enlisted", label: "Enlisted" },
  { value: "officer",  label: "Officer" },
  { value: "color_guard", label: "Color Guard" },
];

const COLOR_GUARD_POSITIONS = [
  "Commander",
  "US Flag Bearer",
  "NSCC Flag Bearer",
  "State Flag Bearer",
  "Unit Flag Bearer",
  "Left Rifle Guard",
  "Right Rifle Guard",
];

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
  const [handoffNotes, setHandoffNotes] = useState(billet?.handoff_notes ?? "");
  const [assignedTo, setAssignedTo] = useState(billet?.assigned_to ?? "");
  const [assignSearch, setAssignSearch] = useState("");
  const [billetType, setBilletType] = useState<string>(billet?.org_section ?? "enlisted");
  const [cgTeam, setCgTeam] = useState<string>(() => {
    const sec = billet?.org_section ?? "";
    return sec.startsWith("color_guard_team_") ? sec.replace("color_guard_", "") : "team_1";
  });
  const [cgPosition, setCgPosition] = useState<string>(() => {
    const n = billet?.name ?? "";
    return COLOR_GUARD_POSITIONS.find((p) => n.includes(p)) ?? "US Flag Bearer";
  });
  const [saving, setSaving] = useState(false);

  const isColorGuard = billetType === "color_guard";

  const filteredProfiles = profiles.filter((p) => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || (p.rank ?? "").toLowerCase().includes(q);
  });

  const submit = async () => {
    const finalName = isColorGuard
      ? `CG ${cgTeam.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} — ${cgPosition}`
      : name.trim();
    if (!finalName) { toast.error("Billet name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: me } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();

    const orgSection = isColorGuard ? `color_guard_${cgTeam}` : billetType;

    const payload = {
      name: finalName,
      description: description.trim() || null,
      duties: duties.trim() || null,
      handoff_notes: handoffNotes.trim() || null,
      assigned_to: assignedTo || null,
      assigned_by: assignedTo ? (me?.id ?? null) : null,
      assigned_at: assignedTo ? new Date().toISOString() : null,
      org_section: orgSection,
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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">{billet ? "Edit Billet" : "New Billet"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {/* Billet type */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Billet Type</label>
            <div className="flex gap-2">
              {BILLET_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBilletType(opt.value)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${billetType === opt.value ? "border-[#003087] bg-[#003087] text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color guard: team + position */}
          {isColorGuard ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Team</label>
                  <select
                    value={cgTeam}
                    onChange={(e) => setCgTeam(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  >
                    {["team_1", "team_2", "team_3", "team_4"].map((t) => (
                      <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Position</label>
                  <select
                    value={cgPosition}
                    onChange={(e) => setCgPosition(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
                  >
                    {COLOR_GUARD_POSITIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">Billet name: <strong>CG {cgTeam.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} — {cgPosition}</strong></p>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Billet Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Supply Petty Officer"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              />
            </div>
          )}

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
              rows={3}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Succession / Handoff Notes</label>
            <textarea
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
              placeholder="Key info for the next person taking this billet…"
              rows={2}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Assign to</label>
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search by name or rank…"
                className="w-full rounded-lg border pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
              />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
              <button
                onClick={() => { setAssignedTo(""); setAssignSearch(""); }}
                className={`w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-50 ${!assignedTo ? "bg-[#003087]/5 font-semibold text-[#003087]" : ""}`}
              >
                — Unassigned —
              </button>
              {filteredProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setAssignedTo(p.id); setAssignSearch(""); }}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${assignedTo === p.id ? "bg-[#003087]/5 font-semibold text-[#003087]" : "text-gray-700"}`}
                >
                  {p.rank ? `${p.rank} ` : ""}{p.full_name}
                </button>
              ))}
              {filteredProfiles.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-400 italic">No members match</p>
              )}
            </div>
            {assignedTo && (
              <p className="mt-1 text-xs text-[#003087] font-medium">
                ✓ {profiles.find((p) => p.id === assignedTo)?.full_name ?? "Selected"}
              </p>
            )}
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
  myInterestBilletIds = [],
  allApplications = [],
}: {
  profile: Profile;
  initialBillets: Billet[];
  allProfiles: ProfileSnippet[];
  myInterestBilletIds?: string[];
  allApplications?: BilletApplication[];
}) {
  const [billets, setBillets] = useState<BilletWithHolder[]>(enrichBillets(initialBillets, allProfiles));
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<BilletWithHolder | null | "new">(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [nominateTarget, setNominateTarget] = useState<BilletWithHolder | null>(null);
  const [interests, setInterests] = useState<Set<string>>(new Set(myInterestBilletIds));
  const [applyTarget, setApplyTarget] = useState<BilletWithHolder | null>(null);
  const [applications, setApplications] = useState<BilletApplication[]>(allApplications);
  const [tab, setTab] = useState<"billets" | "applications">("billets");

  const isCadet = profile.role === "cadet" || profile.role === "nco";
  const isOfficer = profile.role === "officer" || profile.role === "snco" || profile.is_ops || profile.is_command;

  const withdrawInterest = async (billetId: string) => {
    const supabase = createClient();
    await supabase
      .from("billet_interests" as never)
      .delete()
      .eq("cadet_id", profile.id)
      .eq("billet_id", billetId);
    setInterests((prev) => { const next = new Set(prev); next.delete(billetId); return next; });
    toast.success("Application withdrawn");
  };

  const handleApplied = (billetId: string) => {
    setInterests((prev) => new Set(Array.from(prev).concat(billetId)));
    setApplyTarget(null);
    toast.success("Application submitted — OPS will review it");
  };

  const handleReviewDecision = async (appId: string, decision: "selected" | "rejected", billetId: string, cadetId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("billet_interests" as never)
      .update({ status: decision, reviewed_by: profile.id, reviewed_at: new Date().toISOString() } as never)
      .eq("id", appId);
    if (error) { toast.error(error.message); return; }

    if (decision === "selected") {
      // Assign cadet to billet
      await supabase.from("billets").update({ assigned_to: cadetId } as never).eq("id", billetId);
      setBillets((prev) => prev.map((b) => {
        if (b.id !== billetId) return b;
        const cadet = allProfiles.find((p) => p.id === cadetId);
        return { ...b, assigned_to: cadetId, holder: cadet ?? null };
      }));
      toast.success("Cadet selected and assigned to billet");
    } else {
      toast.success("Application rejected");
    }

    setApplications((prev) =>
      prev.map((a) => a.id === appId ? { ...a, status: decision } : a)
    );
  };

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
  const officerAssigned = assigned.filter((b) => b.holder?.role === "officer");
  const cadetAssigned = assigned.filter((b) => b.holder?.role !== "officer");

  const pendingCount = applications.filter((a) => a.status === "pending").length;

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

      {/* Tabs (officers only) */}
      {isOfficer && (
        <div className="flex gap-1 rounded-xl border bg-gray-50 p-1">
          {([["billets", "Billets"], ["applications", "Applications"]] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key as "billets" | "applications")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
                tab === key ? "bg-white text-[#003087] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {key === "applications" && <ClipboardList className="h-4 w-4" />}
              {label}
              {key === "applications" && pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Applications tab — officers only */}
      {isOfficer && tab === "applications" && (
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white py-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">No applications yet</p>
            </div>
          ) : (
            <>
              {(["pending", "selected", "rejected"] as const).map((status) => {
                const group = applications.filter((a) => a.status === status);
                if (group.length === 0) return null;
                return (
                  <section key={status}>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      {status === "pending" ? `Pending Review (${group.length})` : status === "selected" ? "Selected" : "Rejected"}
                    </h2>
                    <div className="space-y-3">
                      {group.map((app) => {
                        const billetName = billets.find((b) => b.id === app.billet_id)?.name ?? app.billet_id;
                        return (
                          <div key={app.id} className="rounded-xl border bg-white p-5 shadow-sm">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-gray-800">{app.cadet?.full_name ?? "Unknown Cadet"}</p>
                                <p className="text-xs text-gray-400">{app.cadet?.rank} · Applying for: <span className="font-semibold text-[#003087]">{billetName}</span></p>
                              </div>
                              <span className="text-[11px] text-gray-300">{new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                            {app.statement ? (
                              <blockquote className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-sm italic text-gray-600">
                                &ldquo;{app.statement}&rdquo;
                              </blockquote>
                            ) : (
                              <p className="mb-4 text-sm italic text-gray-400">No statement provided.</p>
                            )}
                            {status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReviewDecision(app.id, "selected", app.billet_id, app.cadet_id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                                >
                                  <CheckCircle className="h-4 w-4" /> Select & Assign
                                </button>
                                <button
                                  onClick={() => handleReviewDecision(app.id, "rejected", app.billet_id, app.cadet_id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                                >
                                  <XCircle className="h-4 w-4" /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Billets tab (default) */}
      {(!isOfficer || tab === "billets") && <>

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

      {/* Officer billets */}
      {officerAssigned.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Officer Billets ({officerAssigned.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {officerAssigned.map((b) => (
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

      {/* Cadet billets */}
      {cadetAssigned.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Enlisted Billets ({cadetAssigned.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cadetAssigned.map((b) => (
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
                onNominate={() => setNominateTarget(b)}
                showInterest={isCadet}
                isInterested={interests.has(b.id)}
                onApply={() => setApplyTarget(b)}
                onWithdraw={() => withdrawInterest(b.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {editTarget !== null && (
        <BilletModal
          billet={editTarget === "new" ? null : editTarget}
          profiles={allProfiles}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
      {nominateTarget && (
        <NominateDialog
          billet={nominateTarget}
          profiles={allProfiles}
          onClose={() => setNominateTarget(null)}
        />
      )}
      </> /* end billets tab */}

      {applyTarget && (
        <BilletApplyModal
          billet={applyTarget}
          cadetId={profile.id}
          onClose={() => setApplyTarget(null)}
          onApplied={handleApplied}
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
  onNominate,
  showInterest = false,
  isInterested = false,
  onApply,
  onWithdraw,
}: {
  billet: BilletWithHolder;
  isOfficer: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onNominate?: () => void;
  showInterest?: boolean;
  isInterested?: boolean;
  onApply?: () => void;
  onWithdraw?: () => void;
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2">
                <User className="h-4 w-4 text-gray-300" />
                <p className="text-sm text-gray-300 italic">Vacant</p>
                {isOfficer && (
                  <div className="ml-auto flex items-center gap-2">
                    {onNominate && (
                      <button
                        onClick={onNominate}
                        className="flex items-center gap-1 text-xs font-medium text-[#003087] hover:underline"
                      >
                        <Send className="h-3 w-3" /> Nominate
                      </button>
                    )}
                    <button
                      onClick={onEdit}
                      className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Assign
                    </button>
                  </div>
                )}
              </div>
              {showInterest && (
                isInterested ? (
                  <button
                    onClick={onWithdraw}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    <XCircle className="h-3 w-3" /> Withdraw Application
                  </button>
                ) : (
                  <button
                    onClick={onApply}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#003087]/20 bg-[#003087]/5 px-3 py-1.5 text-xs font-semibold text-[#003087] hover:bg-[#003087]/10"
                  >
                    <Send className="h-3 w-3" /> Apply for Billet
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BilletApplyModal({
  billet,
  cadetId,
  onClose,
  onApplied,
}: {
  billet: BilletWithHolder;
  cadetId: string;
  onClose: () => void;
  onApplied: (billetId: string) => void;
}) {
  const [statement, setStatement] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("billet_interests" as never)
      .insert({ cadet_id: cadetId, billet_id: billet.id, statement: statement.trim() || null, status: "pending" } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onApplied(billet.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-800">Apply for Billet</h2>
            <p className="text-xs text-gray-400">{billet.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          {billet.description && (
            <p className="text-sm text-gray-500">{billet.description}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Why do you want this billet? <span className="font-normal text-gray-400">(optional but recommended)</span>
            </label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={5}
              placeholder="Describe why you want this position, any relevant experience, and what you would bring to it…"
              className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={submit}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#003087] py-2.5 text-sm font-bold text-white hover:bg-[#002266] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {saving ? "Submitting…" : "Submit Application"}
            </button>
            <button onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
