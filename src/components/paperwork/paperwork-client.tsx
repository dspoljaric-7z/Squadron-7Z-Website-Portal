"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { FileWarning, X, CheckCircle2, AlertTriangle, Clock, HelpCircle, Settings, Plus, Trash2 } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const PAPERWORK_HINTS = [
  { heading: "Tracking a document", body: "Click the cadet's row to open their paperwork status. Mark each document as Submitted, Pending, or Missing. Add a note if something is in progress." },
  { heading: "Document types", body: "Click the gear icon to manage the list of required document types (e.g. parent forms, physicals, consent forms). Add or deactivate types as requirements change." },
  { heading: "Filtering by status", body: "Use the filter buttons to quickly see all cadets missing a specific document, or all cadets with complete paperwork." },
  { heading: "Who can edit", body: "Officers and SNCOs can update paperwork status. Yeomen may also have access if granted by command." },
];
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Profile, CadetPaperwork, PaperworkDocType } from "@/types/database";
import { addPaperworkDocType, deactivatePaperworkDocType } from "@/app/(app)/settings/actions";

type ProfileSnippet = Pick<Profile, "id" | "full_name" | "rank" | "role">;

type DocStatus = "valid" | "expiring" | "expired" | "missing";

function getStatus(pw: CadetPaperwork | undefined, today: string): DocStatus {
  if (!pw || !pw.expiry_date) return "missing";
  if (pw.expiry_date < today) return "expired";
  const expiry = new Date(pw.expiry_date);
  const todayDate = new Date(today);
  const diffDays = (expiry.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return "expiring";
  return "valid";
}

const STATUS_STYLES: Record<DocStatus, { cell: string; icon: React.ReactNode; }> = {
  valid:    { cell: "bg-green-50 text-green-700",  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> },
  expiring: { cell: "bg-amber-50 text-amber-700",  icon: <Clock className="h-3.5 w-3.5 text-amber-500" /> },
  expired:  { cell: "bg-red-50 text-red-700",      icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> },
  missing:  { cell: "bg-gray-50 text-gray-400",    icon: <HelpCircle className="h-3.5 w-3.5 text-gray-300" /> },
};

function EditDocDialog({
  cadet,
  docType,
  existing,
  onSave,
  onClose,
}: {
  cadet: ProfileSnippet;
  docType: PaperworkDocType;
  existing: CadetPaperwork | null;
  onSave: (pw: CadetPaperwork) => void;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(existing?.submitted_date ?? "");
  const [expiry, setExpiry] = useState(existing?.expiry_date ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: me } = await supabase.from("profiles").select("id").eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();

    const payload = {
      cadet_id: cadet.id,
      doc_type_id: docType.id,
      submitted_date: submitted || null,
      expiry_date: expiry || null,
      notes: notes.trim() || null,
      updated_by: me?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let data, error;
    if (existing) {
      ({ data, error } = await supabase.from("cadet_paperwork").update(payload as never).eq("id", existing.id).select().single());
    } else {
      ({ data, error } = await supabase.from("cadet_paperwork").insert(payload as never).select().single());
    }

    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    onSave(data as CadetPaperwork);
    toast.success("Saved");
  };

  const remove = async () => {
    if (!existing || !confirm("Clear this document record?")) return;
    const supabase = createClient();
    await supabase.from("cadet_paperwork").delete().eq("id", existing.id);
    onSave({ ...existing, expiry_date: null, submitted_date: null });
    toast.success("Cleared");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-800">{docType.label}</h2>
            <p className="text-xs text-gray-400">{cadet.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Submitted Date</label>
            <input type="date" value={submitted} onChange={(e) => setSubmitted(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Expiry Date</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t px-5 py-4">
          {existing ? (
            <button onClick={remove} className="text-xs text-red-400 hover:text-red-600">Clear record</button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageTypesDialog({
  docTypes,
  onAdded,
  onRemoved,
  onClose,
}: {
  docTypes: PaperworkDocType[];
  onAdded: (dt: PaperworkDocType) => void;
  onRemoved: (id: string) => void;
  onClose: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newShort, setNewShort] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    const res = await addPaperworkDocType(newLabel.trim(), newShort.trim());
    setAdding(false);
    if (res.error) { toast.error(res.error); return; }
    onAdded(res.data as unknown as PaperworkDocType);
    setNewLabel("");
    setNewShort("");
    toast.success("Document type added");
  };

  const handleRemove = async (id: string, label: string) => {
    if (!confirm(`Remove "${label}"? Existing records for this type will be deleted.`)) return;
    const res = await deactivatePaperworkDocType(id);
    if (res.error) { toast.error(res.error); return; }
    onRemoved(id);
    toast.success("Removed");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-gray-800">Manage Document Types</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {docTypes.map((dt) => (
            <div key={dt.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{dt.label}</p>
                <p className="text-xs text-gray-400">Column: &quot;{dt.short_label}&quot;</p>
              </div>
              <button onClick={() => handleRemove(dt.id, dt.label)} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Add New Type</p>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Full label (e.g. NSCC Medical History)"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
            <input value={newShort} onChange={(e) => setNewShort(e.target.value)} placeholder="Short column label (e.g. Medical) — optional"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30" />
            <Button onClick={handleAdd} disabled={adding || !newLabel.trim()} size="sm" className="w-full bg-[#003087] hover:bg-[#002266]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />{adding ? "Adding…" : "Add Type"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaperworkClient({
  profiles,
  initialPaperwork,
  docTypes: initialDocTypes,
  canManageTypes,
}: {
  profiles: ProfileSnippet[];
  initialPaperwork: CadetPaperwork[];
  docTypes: PaperworkDocType[];
  canManageTypes: boolean;
}) {
  const [paperwork, setPaperwork] = useState<CadetPaperwork[]>(initialPaperwork);
  const [docTypes, setDocTypes] = useState<PaperworkDocType[]>(initialDocTypes);
  const [editing, setEditing] = useState<{ cadet: ProfileSnippet; docType: PaperworkDocType } | null>(null);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [filter, setFilter] = useState<"all" | "issues">("issues");
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const pwMap = new Map<string, CadetPaperwork>();
  for (const p of paperwork) {
    pwMap.set(`${p.cadet_id}::${p.doc_type_id}`, p);
  }

  const getDoc = (cadetId: string, docTypeId: string) => pwMap.get(`${cadetId}::${docTypeId}`);

  const filteredProfiles = profiles.filter((p) => {
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "issues") {
      return docTypes.some((dt) => {
        const s = getStatus(getDoc(p.id, dt.id), today);
        return s === "expired" || s === "expiring" || s === "missing";
      });
    }
    return true;
  });

  const expiredCount = profiles.reduce((acc, p) => {
    const hasExpired = docTypes.some((dt) => getStatus(getDoc(p.id, dt.id), today) === "expired");
    return acc + (hasExpired ? 1 : 0);
  }, 0);

  const expiringCount = profiles.reduce((acc, p) => {
    const hasExpiring = docTypes.some((dt) => getStatus(getDoc(p.id, dt.id), today) === "expiring");
    return acc + (hasExpiring ? 1 : 0);
  }, 0);

  const handleSaved = (saved: CadetPaperwork) => {
    setPaperwork((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      if (exists) return prev.map((p) => (p.id === saved.id ? saved : p));
      return [...prev, saved];
    });
    setEditing(null);
  };

  const editingDoc = editing ? getDoc(editing.cadet.id, editing.docType.id) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-[#003087]" />
          <h1 className="text-xl font-bold text-gray-900">Paperwork Tracker</h1>
          <HintButton title="Paperwork Tracker" hints={PAPERWORK_HINTS} />
        </div>
        {canManageTypes && (
          <button
            onClick={() => setShowManageTypes(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" /> Manage Types
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {expiredCount > 0 && (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />{expiredCount} expired
          </Badge>
        )}
        {expiringCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />{expiringCount} expiring in 30 days
          </Badge>
        )}
        {expiredCount === 0 && expiringCount === 0 && (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />All paperwork current
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cadets…"
          className="rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30 max-w-xs"
        />
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(["issues", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-medium transition-colors ${filter === f ? "bg-[#003087] text-white" : "text-gray-500 hover:bg-gray-50"}`}
            >
              {f === "issues" ? "Issues only" : "All cadets"}
            </button>
          ))}
        </div>
      </div>

      {docTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-gray-400">
          No document types configured yet.
          {canManageTypes && (
            <button onClick={() => setShowManageTypes(true)} className="ml-1 text-[#003087] hover:underline">Add one →</button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto shadow-sm">
          <table className="w-full" style={{ minWidth: `${280 + docTypes.length * 130}px` }}>
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-48">Cadet</th>
                {docTypes.map((dt) => (
                  <th key={dt.id} className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">{dt.short_label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={docTypes.length + 1} className="px-4 py-10 text-center text-sm text-gray-400">
                    {filter === "issues" ? "No paperwork issues found." : "No cadets found."}
                  </td>
                </tr>
              )}
              {filteredProfiles.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <p className="text-sm font-semibold text-gray-800">{p.full_name}</p>
                    {p.rank && <p className="text-xs text-gray-400">{p.rank}</p>}
                  </td>
                  {docTypes.map((dt) => {
                    const doc = getDoc(p.id, dt.id);
                    const status = getStatus(doc, today);
                    const s = STATUS_STYLES[status];
                    return (
                      <td key={dt.id} className="px-2 py-2 text-center">
                        <button
                          onClick={() => setEditing({ cadet: p, docType: dt })}
                          className={`inline-flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:opacity-80 min-w-[90px] ${s.cell}`}
                        >
                          <span className="flex items-center gap-1">
                            {s.icon}
                            {status === "missing" ? "Not on file" : doc?.expiry_date ?? "—"}
                          </span>
                          {status !== "missing" && (
                            <span className="opacity-70 capitalize">{status}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditDocDialog
          cadet={editing.cadet}
          docType={editing.docType}
          existing={editingDoc}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}

      {showManageTypes && (
        <ManageTypesDialog
          docTypes={docTypes}
          onAdded={(dt) => setDocTypes((prev) => [...prev, dt])}
          onRemoved={(id) => setDocTypes((prev) => prev.filter((dt) => dt.id !== id))}
          onClose={() => setShowManageTypes(false)}
        />
      )}
    </div>
  );
}
