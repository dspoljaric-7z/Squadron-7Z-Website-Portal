"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import { ChevronDown, Network, Pencil, Plus, Trash2, X, Save, Loader2 } from "lucide-react";
import type { Billet, Profile } from "@/types/database";
import { createBillet, updateBilletStructure, deleteBillet } from "@/app/(app)/billets/actions";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role" | "billet" | "avatar_url">;
type BilletWithHolder = Billet & { holder: ProfileSnippet | null };

const ROLE_BG: Record<string, string> = {
  officer: "bg-[#B8860B]",
  snco:    "bg-purple-600",
  nco:     "bg-amber-500",
  cadet:   "bg-[#003087]",
};
const ROLE_RING: Record<string, string> = {
  officer: "ring-2 ring-[#B8860B]/50",
  snco:    "ring-2 ring-purple-300",
  nco:     "ring-2 ring-amber-300",
  cadet:   "ring-2 ring-blue-200",
};

// ── Tree helpers ──────────────────────────────────────────────────────────────
function buildChildMap(billets: BilletWithHolder[]): Map<string | null, BilletWithHolder[]> {
  const map = new Map<string | null, BilletWithHolder[]>();
  for (const b of billets) {
    const parent = b.parent_billet_id ?? null;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(b);
  }
  Array.from(map.values()).forEach((children) => {
    children.sort((a, b) => a.sort_order - b.sort_order);
  });
  return map;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({
  h, size = "md", bgOverride, ringOverride,
}: {
  h: BilletWithHolder["holder"];
  size?: "lg" | "md" | "sm";
  bgOverride?: string | null;
  ringOverride?: string | null;
}) {
  const sz =
    size === "lg" ? "h-14 w-14 text-sm" :
    size === "md" ? "h-11 w-11 text-xs" :
                    "h-9  w-9  text-xs";
  const bg   = h ? (bgOverride   ?? ROLE_BG[h.role]  ?? "bg-gray-300") : "bg-gray-100";
  const ring = h ? (ringOverride ?? ROLE_RING[h.role] ?? "")            : "ring-2 ring-dashed ring-gray-300";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${sz} ${bg} ${ring}`}>
      {h ? initials(h.full_name) : <Network className="h-3 w-3 text-gray-300" />}
    </div>
  );
}

// ── Org chart node ─────────────────────────────────────────────────────────────
function Node({ b, size = "md", bg, ring }: { b: BilletWithHolder; size?: "lg" | "md" | "sm"; bg?: string | null; ring?: string | null }) {
  const h  = b.holder;
  const w  = size === "lg" ? "w-40" : size === "md" ? "w-32" : "w-28";
  return (
    <div className={`flex flex-col items-center gap-1.5 ${w}`}>
      <Av h={h} size={size} bgOverride={bg} ringOverride={ring} />
      <div className="w-full text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">{b.name}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold leading-snug text-gray-700">
          {h ? h.full_name : <span className="font-normal italic text-gray-400">Vacant</span>}
        </p>
        {h?.rank && <p className="text-[10px] font-bold text-[#B8860B]">{h.rank}</p>}
      </div>
    </div>
  );
}

// ── Officer row ────────────────────────────────────────────────────────────────
function ORow({ b }: { b: BilletWithHolder }) {
  const h = b.holder;
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 py-1.5 last:border-0">
      <Av h={h} size="sm" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{b.name}</p>
        <p className="truncate text-xs font-medium text-gray-700">
          {h ? h.full_name : <span className="font-normal italic text-gray-400">Vacant</span>}
        </p>
      </div>
    </div>
  );
}

// ── Connectors ─────────────────────────────────────────────────────────────────
function VLine() { return <div className="mx-auto h-5 w-px bg-gray-200" />; }

// ── ALPO column: ALPO node → DPOs (each with their ADPO) ─────────────────────
function AlpoColumn({
  alpo, childMap,
}: {
  alpo: BilletWithHolder;
  childMap: Map<string | null, BilletWithHolder[]>;
}) {
  const dpos = childMap.get(alpo.id) ?? [];
  return (
    <div className="flex flex-col items-center gap-0">
      <Node b={alpo} size="md" bg="bg-blue-600" ring="ring-2 ring-blue-300" />
      {dpos.length > 0 && (
        <>
          <VLine />
          <div className="flex items-start gap-3">
            {dpos.map((dpo) => {
              const adpos = childMap.get(dpo.id) ?? [];
              return (
                <div key={dpo.id} className="flex flex-col items-center gap-0">
                  <Node b={dpo} size="sm" />
                  {adpos.map((adpo) => (
                    <div key={adpo.id} className="flex flex-col items-center">
                      <VLine />
                      <Node b={adpo} size="sm" />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Directory tree row (recursive) ────────────────────────────────────────────
function TreeRow({
  b, childMap, expanded, toggle, depth = 0,
}: {
  b: BilletWithHolder;
  childMap: Map<string | null, BilletWithHolder[]>;
  expanded: Set<string>;
  toggle: (id: string) => void;
  depth?: number;
}) {
  const h         = b.holder;
  const isOpen    = expanded.has(b.id);
  const hasDetail = !!(b.description || b.prerequisites || b.duties);
  const children  = childMap.get(b.id) ?? [];

  const bullets = (text: string) =>
    text.split(". ").filter(Boolean).map((s, i) => (
      <li key={i} className="flex items-start gap-1.5 text-gray-600">
        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
        {s.endsWith(".") ? s : `${s}.`}
      </li>
    ));

  return (
    <div>
      <button
        className={`group w-full flex items-center gap-2.5 rounded-lg py-1.5 px-2 text-left transition-colors ${
          hasDetail ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
        } ${isOpen ? "bg-gray-50" : ""}`}
        onClick={() => hasDetail && toggle(b.id)}
      >
        <Av h={h} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-sm font-semibold truncate ${h ? "text-gray-800" : "text-gray-400"}`}>{b.name}</span>
            {b.is_advisory && (
              <span className="rounded border border-gray-200 px-1 py-px text-[9px] font-medium italic text-gray-400">advisory</span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            {h ? (h.rank ? `${h.rank} ${h.full_name}` : h.full_name) : <span className="italic text-gray-400">Vacant</span>}
          </p>
        </div>
        {hasDetail && (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && hasDetail && (
        <div className="ml-9 mr-1 mb-1 mt-0.5 rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-xs">
          {b.description && <p className="mb-2.5 leading-relaxed text-gray-600 font-medium">{b.description}</p>}
          {b.prerequisites && (
            <div className="mb-2.5">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Prerequisites</p>
              <ul className="space-y-0.5">{bullets(b.prerequisites)}</ul>
            </div>
          )}
          {b.duties && (
            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Duties</p>
              <ul className="space-y-0.5">{bullets(b.duties)}</ul>
            </div>
          )}
        </div>
      )}

      {children.length > 0 && (
        <div className="ml-5 border-l border-gray-100 pl-2">
          {children.map((child) => (
            <TreeRow key={child.id} b={child} childMap={childMap} expanded={expanded} toggle={toggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Manage Structure tab ───────────────────────────────────────────────────────
const ORG_SECTIONS = ["officer", "cadet", "maa"] as const;

function ManageTab({
  billets,
  onRefresh,
}: {
  billets: BilletWithHolder[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [addingParentId, setAddingParentId] = useState<string | null>("root");
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const [editForm, setEditForm] = useState<{
    name: string; parent_billet_id: string; org_section: string; sort_order: string; is_advisory: boolean;
    description: string; duties: string; prerequisites: string;
  }>({ name: "", parent_billet_id: "", org_section: "cadet", sort_order: "999", is_advisory: false, description: "", duties: "", prerequisites: "" });

  const [addForm, setAddForm] = useState<{
    name: string; org_section: string; sort_order: string; is_advisory: boolean;
    description: string; duties: string; prerequisites: string;
  }>({ name: "", org_section: "cadet", sort_order: "999", is_advisory: false, description: "", duties: "", prerequisites: "" });

  const childMap = buildChildMap(billets);
  const idMap = Object.fromEntries(billets.map((b) => [b.id, b]));

  const startEdit = (b: BilletWithHolder) => {
    setEditingId(b.id);
    setEditForm({
      name: b.name,
      parent_billet_id: b.parent_billet_id ?? "",
      org_section: b.org_section ?? "cadet",
      sort_order: String(b.sort_order),
      is_advisory: b.is_advisory,
      description: b.description ?? "",
      duties: b.duties ?? "",
      prerequisites: b.prerequisites ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    startTransition(async () => {
      const res = await updateBilletStructure(editingId, {
        name: editForm.name,
        parent_billet_id: editForm.parent_billet_id || null,
        org_section: editForm.org_section || null,
        sort_order: parseInt(editForm.sort_order) || 999,
        is_advisory: editForm.is_advisory,
        description: editForm.description || null,
        duties: editForm.duties || null,
        prerequisites: editForm.prerequisites || null,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Billet updated");
      setEditingId(null);
      onRefresh();
    });
  };

  const handleDelete = async (b: BilletWithHolder) => {
    startTransition(async () => {
      const res = await deleteBillet(b.id);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(`"${b.name}" deleted`);
      onRefresh();
    });
  };

  const saveAdd = async (parentId: string | null) => {
    if (!addForm.name.trim()) { toast.error("Name required"); return; }
    startTransition(async () => {
      const res = await createBillet({
        name: addForm.name,
        parent_billet_id: parentId,
        org_section: addForm.org_section || null,
        sort_order: parseInt(addForm.sort_order) || 999,
        is_advisory: addForm.is_advisory,
        description: addForm.description || null,
        duties: addForm.duties || null,
        prerequisites: addForm.prerequisites || null,
      });
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Billet created");
      setAddingParentId(null);
      setShowAddRoot(false);
      setAddForm({ name: "", org_section: "cadet", sort_order: "999", is_advisory: false, description: "", duties: "", prerequisites: "" });
      onRefresh();
    });
  };

  function ManageRow({ b, depth = 0 }: { b: BilletWithHolder; depth?: number }) {
    const children  = childMap.get(b.id) ?? [];
    const isEditing = editingId === b.id;
    const isAdding  = addingParentId === b.id;
    const indent    = depth * 20;

    return (
      <div>
        {isEditing ? (
          <div className="mx-2 my-1 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700">Editing: {b.name}</span>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Name</label>
                <input className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sort Order</label>
                <input type="number" className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.sort_order} onChange={(e) => setEditForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Section</label>
                <select className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.org_section} onChange={(e) => setEditForm((f) => ({ ...f, org_section: e.target.value }))}>
                  {ORG_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Reports To</label>
                <select className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.parent_billet_id} onChange={(e) => setEditForm((f) => ({ ...f, parent_billet_id: e.target.value }))}>
                  <option value="">(no parent — root)</option>
                  {billets.filter((x) => x.id !== b.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description</label>
                <textarea rows={2} className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duties</label>
                <textarea rows={2} className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.duties} onChange={(e) => setEditForm((f) => ({ ...f, duties: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Prerequisites</label>
                <textarea rows={2} className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={editForm.prerequisites} onChange={(e) => setEditForm((f) => ({ ...f, prerequisites: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={editForm.is_advisory} onChange={(e) => setEditForm((f) => ({ ...f, is_advisory: e.target.checked }))} />
                Advisory (outside reporting chain)
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={isPending} className="flex items-center gap-1.5 rounded bg-[#003087] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
              <button onClick={() => setEditingId(null)} className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 group" style={{ paddingLeft: indent + 8 }}>
            <Av h={b.holder} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-sm font-medium ${b.holder ? "text-gray-800" : "text-gray-400"}`}>{b.name}</span>
                <span className="text-[9px] text-gray-400 rounded bg-gray-100 px-1">{b.org_section ?? "?"}</span>
                <span className="text-[9px] text-gray-300">#{b.sort_order}</span>
                {b.is_advisory && <span className="text-[9px] italic text-gray-400 rounded border border-gray-200 px-1">advisory</span>}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {b.holder ? (b.holder.rank ? `${b.holder.rank} ${b.holder.full_name}` : b.holder.full_name) : "Vacant"}
                {b.parent_billet_id && idMap[b.parent_billet_id] && (
                  <span className="ml-2 text-gray-300">→ {idMap[b.parent_billet_id].name}</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setAddingParentId(b.id); setAddForm({ name: "", org_section: b.org_section ?? "cadet", sort_order: "999", is_advisory: false, description: "", duties: "", prerequisites: "" }); }} className="rounded p-1 text-gray-400 hover:text-green-600 hover:bg-green-50" title="Add child billet">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => startEdit(b)} className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {!b.holder && (childMap.get(b.id) ?? []).length === 0 && (
                <button onClick={() => handleDelete(b)} disabled={isPending} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add child form */}
        {isAdding && (
          <AddForm
            parentId={b.id}
            form={addForm}
            setForm={setAddForm}
            onSave={() => saveAdd(b.id)}
            onCancel={() => setAddingParentId(null)}
            isPending={isPending}
            billets={billets}
          />
        )}

        {children.length > 0 && children.map((child) => (
          <ManageRow key={child.id} b={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const roots = (childMap.get(null) ?? []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{billets.length} total billets — edit parent/sort order to reorganize</p>
        <button
          onClick={() => { setShowAddRoot(true); setAddForm({ name: "", org_section: "cadet", sort_order: "999", is_advisory: false, description: "", duties: "", prerequisites: "" }); }}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#003087]/40 px-3 py-1.5 text-xs font-medium text-[#003087] hover:bg-[#003087]/5"
        >
          <Plus className="h-3.5 w-3.5" /> New root billet
        </button>
      </div>

      {showAddRoot && (
        <AddForm
          parentId={null}
          form={addForm}
          setForm={setAddForm}
          onSave={() => saveAdd(null)}
          onCancel={() => setShowAddRoot(false)}
          isPending={isPending}
          billets={billets}
        />
      )}

      <div className="rounded-xl border bg-white shadow-sm divide-y divide-gray-50">
        {roots.map((b) => <ManageRow key={b.id} b={b} />)}
        {roots.length === 0 && (
          <p className="p-4 text-center text-sm italic text-gray-400">
            No billets yet — run the SQL migration first, then click &quot;New root billet&quot; to add.
          </p>
        )}
      </div>
    </div>
  );
}

function AddForm({
  parentId, form, setForm, onSave, onCancel, isPending, billets,
}: {
  parentId: string | null;
  form: { name: string; org_section: string; sort_order: string; is_advisory: boolean; description: string; duties: string; prerequisites: string };
  setForm: (fn: (f: typeof form) => typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  billets: BilletWithHolder[];
}) {
  const parentName = parentId ? billets.find((b) => b.id === parentId)?.name : null;
  return (
    <div className="mx-2 my-1 rounded-lg border border-green-200 bg-green-50 p-3 text-sm space-y-2">
      <span className="text-xs font-bold text-green-700">
        {parentName ? `New child under "${parentName}"` : "New root billet"}
      </span>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Name *</label>
          <input autoFocus className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sort Order</label>
          <input type="number" className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Section</label>
          <select className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={form.org_section} onChange={(e) => setForm((f) => ({ ...f, org_section: e.target.value }))}>
            {ORG_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.is_advisory} onChange={(e) => setForm((f) => ({ ...f, is_advisory: e.target.checked }))} />
            Advisory
          </label>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Description (optional)</label>
        <textarea rows={2} className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={isPending || !form.name.trim()} className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Create
        </button>
        <button onClick={onCancel} className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Cancel</button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
type Tab = "org" | "directory" | "manage";

export function ChainOfCommandClient({
  billets: initialBillets,
  profiles,
  profile,
  defaultTab = "org",
}: {
  billets: Billet[];
  profiles: ProfileSnippet[];
  profile?: Profile;
  defaultTab?: string;
}) {
  const router = useRouter();
  const isOfficer = profile?.role === "officer";
  const validTabs: Tab[] = isOfficer ? ["org", "directory", "manage"] : ["org", "directory"];
  const initTab = validTabs.includes(defaultTab as Tab) ? (defaultTab as Tab) : "org";
  const [tab, setTab]         = useState<Tab>(initTab);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const billets = initialBillets;

  const handleTab = (t: Tab) => {
    setTab(t);
    router.replace(`/chain-of-command?tab=${t}`, { scroll: false });
  };

  const toggle = (id: string) =>
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const enriched: BilletWithHolder[] = billets
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => ({ ...b, holder: b.assigned_to ? (byId[b.assigned_to] ?? null) : null }));

  const childMap = buildChildMap(enriched);
  const filled = enriched.filter((b) => b.holder).length;

  // Check whether the migration has been run
  const migrationDone = enriched.some((b) => b.org_section !== null);

  // Org chart groupings
  const officerBillets  = enriched.filter((b) => b.org_section === "officer");
  const cadetAdvisory   = enriched.filter((b) => b.org_section === "cadet" && b.is_advisory);
  const cadetRoot       = enriched.filter((b) => b.org_section === "cadet" && !b.is_advisory && !b.parent_billet_id);
  const maaBillets      = enriched.filter((b) => b.org_section === "maa");
  const unmappedBillets = enriched.filter((b) => !b.org_section);

  // Officer chain
  const co    = officerBillets.find((b) => !b.parent_billet_id && (childMap.get(null) ?? []).some((x) => x.id === b.id));
  const xo    = co ? (childMap.get(co.id) ?? [])[0] : undefined;
  const staff = xo ? childMap.get(xo.id) ?? [] : [];

  // Cadet chain: lpo is root cadet billet (first root cadet, not advisory)
  const lpo  = cadetRoot[0];
  const alpos = lpo ? (childMap.get(lpo.id) ?? []) : [];

  // Directories
  const sectionRoots = (section: string) =>
    enriched.filter((b) => b.org_section === section && !b.parent_billet_id);

  // For directory, also show unmapped billets
  const allRoots = (childMap.get(null) ?? []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chain of Command</h1>
        <p className="text-sm text-gray-400">{filled} of {enriched.length} billets filled</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {validTabs.map((t) => (
            <button
              key={t}
              onClick={() => handleTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[#003087] text-[#003087]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t === "org" ? "Org Chart" : t === "directory" ? "Billet Directory" : "Manage Structure"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Org Chart ── */}
      {tab === "org" && (
        <div className="space-y-4">
          {!migrationDone ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">SQL migration required</p>
              <p>Run the migration in your Supabase SQL editor to enable the dynamic org chart. Go to Manage Structure for instructions.</p>
            </div>
          ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <div className="flex min-w-max">
              {/* LEFT: Unit Officers */}
              <div className="w-52 shrink-0 border-r border-gray-100 p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#003087]">Unit Officers</p>
                {co && (
                  <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-[#003087]/5 px-2.5 py-2">
                    <Av h={co.holder} size="md" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{co.name}</p>
                      <p className="truncate text-xs font-semibold text-gray-800">{co.holder?.full_name ?? "Vacant"}</p>
                      {co.holder?.rank && <p className="text-[10px] font-bold text-[#B8860B]">{co.holder.rank}</p>}
                    </div>
                  </div>
                )}
                {xo && (
                  <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-gray-50 px-2.5 py-2">
                    <Av h={xo.holder} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{xo.name}</p>
                      <p className="truncate text-xs font-medium text-gray-700">{xo.holder?.full_name ?? "Vacant"}</p>
                    </div>
                  </div>
                )}
                {staff.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    {staff.map((b) => <ORow key={b.id} b={b} />)}
                  </div>
                )}
                {officerBillets.filter((b) => !co && !xo && !staff.includes(b)).length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    {officerBillets.map((b) => <ORow key={b.id} b={b} />)}
                  </div>
                )}
              </div>

              {/* RIGHT: Cadet Chain */}
              <div className="flex flex-1 flex-col items-center px-8 py-6 gap-0">
                {/* Advisory */}
                {cadetAdvisory.map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-2.5 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{b.name}</p>
                      <p className="text-[8px] italic text-gray-300">advisory — outside chain</p>
                      <p className="mt-1 text-xs font-semibold text-gray-700">{b.holder?.full_name ?? "Vacant"}</p>
                      {b.holder?.rank && <p className="text-[10px] font-bold text-[#B8860B]">{b.holder.rank}</p>}
                    </div>
                    <VLine />
                  </div>
                ))}

                {/* LPO */}
                {lpo && (
                  <div className="flex flex-col items-center">
                    <Node b={lpo} size="lg" />
                    {alpos.length > 0 && <VLine />}
                  </div>
                )}

                {/* ALPOs — each as a column with its DPOs/ADPOs */}
                {alpos.length > 0 && (
                  <div className="flex items-start gap-6">
                    {alpos.map((alpo) => (
                      <AlpoColumn key={alpo.id} alpo={alpo} childMap={childMap} />
                    ))}
                  </div>
                )}

                {/* MAA chain */}
                {maaBillets.length > 0 && (
                  <div className="mt-4 flex flex-col items-center border-t border-gray-100 pt-4 w-full">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">Master-at-Arms</p>
                    {sectionRoots("maa").map((maa) => (
                      <div key={maa.id} className="flex flex-col items-center">
                        <Node b={maa} size="md" />
                        {(childMap.get(maa.id) ?? []).map((amaa) => (
                          <div key={amaa.id} className="flex flex-col items-center">
                            <VLine />
                            <Node b={amaa} size="sm" />
                            {(childMap.get(amaa.id) ?? []).map((aamaa) => (
                              <div key={aamaa.id} className="flex flex-col items-center">
                                <VLine />
                                <Node b={aamaa} size="sm" />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white px-4 py-2.5 text-xs text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rank</span>
            {[
              { label: "Officer", cls: "bg-[#B8860B]" },
              { label: "SNCO",    cls: "bg-purple-600" },
              { label: "NCO",     cls: "bg-amber-500"  },
              { label: "Cadet",   cls: "bg-[#003087]"  },
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
      )}

      {/* ── Billet Directory ── */}
      {tab === "directory" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-white shadow-sm p-3">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Full Chain · click any billet to expand
            </p>
            {allRoots.map((b) => (
              <TreeRow key={b.id} b={b} childMap={childMap} expanded={expanded} toggle={toggle} />
            ))}
            {allRoots.length === 0 && (
              <p className="p-4 text-center text-sm italic text-gray-400">No billets configured yet.</p>
            )}
          </div>

          {unmappedBillets.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Unmapped Billets (no org section set)
              </p>
              <div className="rounded-xl border bg-white shadow-sm p-3 space-y-0.5">
                {unmappedBillets.map((b) => (
                  <TreeRow key={b.id} b={b} childMap={childMap} expanded={expanded} toggle={toggle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manage Structure (officers only) ── */}
      {tab === "manage" && isOfficer && (
        <ManageTab
          billets={enriched}
          onRefresh={() => window.location.reload()}
        />
      )}
    </div>
  );
}
