"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, School, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createProspect, updateProspectField } from "@/app/(app)/recruiting/actions";
import { format, parseISO } from "date-fns";
import type { Prospect, ProspectStatus, Profile } from "@/types/database";

const STAGES: { value: ProspectStatus; label: string; color: string; bg: string }[] = [
  { value: "prospect",  label: "Prospect",  color: "text-gray-700",   bg: "bg-gray-100" },
  { value: "contacted", label: "Contacted", color: "text-blue-700",   bg: "bg-blue-50" },
  { value: "visited",   label: "Visited",   color: "text-purple-700", bg: "bg-purple-50" },
  { value: "applied",   label: "Applied",   color: "text-amber-700",  bg: "bg-amber-50" },
  { value: "enrolled",  label: "Enrolled",  color: "text-green-700",  bg: "bg-green-50" },
];

const UNIT_BADGE: Record<string, string> = {
  NSCC: "bg-[#003087]/10 text-[#003087]",
  NLCC: "bg-purple-100 text-purple-700",
  NROTC: "bg-amber-100 text-amber-700",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RecruitingClient({ prospects: initialProspects, profile }: { prospects: Prospect[]; profile: Profile }) {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", unit: "", school: "", grade: "", email: "", phone: "", guardian_name: "", guardian_contact: "", source: "" });
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = prospects;
    if (!showInactive) list = list.filter((p) => p.status !== "inactive" && p.status !== "not_interested");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.school ?? "").toLowerCase().includes(q) || (p.unit ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [prospects, search, showInactive]);

  const byStage = useMemo(() => {
    const map = new Map<ProspectStatus, Prospect[]>();
    STAGES.forEach(({ value }) => map.set(value, []));
    visible.forEach((p) => {
      const bucket = map.get(p.status as ProspectStatus);
      if (bucket) bucket.push(p);
    });
    return map;
  }, [visible]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setAdding(true);
    const result = await createProspect({ ...addForm, unit: addForm.unit || undefined, school: addForm.school || undefined, grade: addForm.grade || undefined, email: addForm.email || undefined, phone: addForm.phone || undefined, guardian_name: addForm.guardian_name || undefined, guardian_contact: addForm.guardian_contact || undefined, source: addForm.source || undefined });
    setAdding(false);
    if ("error" in result) { toast.error(result.error); return; }
    setProspects((p) => [result.prospect as Prospect, ...p]);
    setAddForm({ name: "", unit: "", school: "", grade: "", email: "", phone: "", guardian_name: "", guardian_contact: "", source: "" });
    setShowAddModal(false);
    toast.success("Prospect added");
  };

  const moveStage = async (prospect: Prospect, newStatus: ProspectStatus) => {
    setMovingId(prospect.id);
    const result = await updateProspectField(prospect.id, { status: newStatus });
    setMovingId(null);
    if ("error" in result) { toast.error(result.error ?? "Failed"); return; }
    setProspects((p) => p.map((x) => x.id === prospect.id ? { ...x, status: newStatus } : x));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recruiting Pipeline</h1>
          <p className="text-sm text-gray-500">{prospects.filter((p) => p.status !== "inactive" && p.status !== "not_interested").length} active prospects</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" /> Add Prospect
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prospects…" className="pl-8 h-8 text-sm" />
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${showInactive ? "bg-gray-200 border-gray-300 text-gray-700" : "border-gray-200 text-gray-400 hover:bg-gray-50"}`}
        >
          {showInactive ? "Hide" : "Show"} inactive
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(({ value, label, color, bg }) => {
          const cards = byStage.get(value) ?? [];
          return (
            <div key={value} className="flex-none w-60">
              <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${bg}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
                <span className={`text-xs font-bold ${color}`}>{cards.length}</span>
              </div>
              <div className="space-y-2 rounded-b-lg border border-t-0 border-gray-200 bg-gray-50/50 p-2 min-h-32">
                {cards.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/recruiting/${p.id}`)}
                    className="rounded-lg border bg-white p-2.5 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                      {p.unit && (
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${UNIT_BADGE[p.unit] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.unit}
                        </span>
                      )}
                    </div>
                    {p.school && <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400"><School className="h-3 w-3" />{p.school}{p.grade ? ` · ${p.grade}` : ""}</p>}
                    {p.guardian_contact && <p className="flex items-center gap-1 text-xs text-gray-400"><Phone className="h-3 w-3" />{p.guardian_contact}</p>}
                    {p.email && <p className="flex items-center gap-1 text-xs text-gray-400"><Mail className="h-3 w-3" />{p.email}</p>}
                    {(p.first_visit_date || p.enrollment_date) && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-300">
                        <Calendar className="h-2.5 w-2.5" />
                        {p.enrollment_date
                          ? `Enrolled ${format(parseISO(p.enrollment_date), "d MMM")}`
                          : p.first_visit_date
                          ? `Visited ${format(parseISO(p.first_visit_date), "d MMM")}`
                          : ""}
                      </p>
                    )}
                    {/* Quick move */}
                    <div className="mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={p.status}
                        onValueChange={(v) => moveStage(p, v as ProspectStatus)}
                        disabled={movingId === p.id}
                      >
                        <SelectTrigger className="h-6 text-[10px] border-0 bg-gray-50 px-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                          <SelectItem value="inactive" className="text-xs text-gray-400">Inactive</SelectItem>
                          <SelectItem value="not_interested" className="text-xs text-gray-400">Not Interested</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <p className="pt-4 text-center text-xs text-gray-300 italic">Empty</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Add Prospect</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Select value={addForm.unit} onValueChange={(v) => setAddForm((f) => ({ ...f, unit: v as string }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="NSCC / NLCC" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NSCC">NSCC</SelectItem>
                      <SelectItem value="NLCC">NLCC</SelectItem>
                      <SelectItem value="NROTC">NROTC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grade</Label>
                  <Input value={addForm.grade} onChange={(e) => setAddForm((f) => ({ ...f, grade: e.target.value }))} placeholder="e.g. 9th" className="h-8 text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">School</Label>
                  <Input value={addForm.school} onChange={(e) => setAddForm((f) => ({ ...f, school: e.target.value }))} placeholder="School name" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Guardian Name</Label>
                  <Input value={addForm.guardian_name} onChange={(e) => setAddForm((f) => ({ ...f, guardian_name: e.target.value }))} placeholder="Parent / guardian" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Guardian Contact</Label>
                  <Input value={addForm.guardian_contact} onChange={(e) => setAddForm((f) => ({ ...f, guardian_contact: e.target.value }))} placeholder="Phone or email" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prospect Email</Label>
                  <Input value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="h-8 text-sm" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">How they heard about us</Label>
                  <Input value={addForm.source} onChange={(e) => setAddForm((f) => ({ ...f, source: e.target.value }))} placeholder="e.g. School visit, friend referral, website" className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding || !addForm.name.trim()} className="bg-[#003087] hover:bg-[#002266]">
                {adding ? "Adding…" : "Add Prospect"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
