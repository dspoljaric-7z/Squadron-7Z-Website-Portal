"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, UserCheck, Save, Plus, Check, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { updateProspectField, addProspectNote, toggleChecklistItem, convertToProfile } from "@/app/(app)/recruiting/actions";
import type { Prospect, ProspectNote, ProspectChecklistItem, ProspectStatus, ProspectNoteType, Profile } from "@/types/database";

const STAGES: { value: ProspectStatus; label: string }[] = [
  { value: "prospect",      label: "Prospect" },
  { value: "contacted",     label: "Contacted" },
  { value: "visited",       label: "Visited" },
  { value: "applied",       label: "Applied" },
  { value: "enrolled",      label: "Enrolled" },
  { value: "inactive",      label: "Inactive" },
  { value: "not_interested",label: "Not Interested" },
];

const STATUS_COLORS: Record<ProspectStatus, string> = {
  prospect:       "bg-gray-100 text-gray-700",
  contacted:      "bg-blue-100 text-blue-700",
  visited:        "bg-purple-100 text-purple-700",
  applied:        "bg-amber-100 text-amber-700",
  enrolled:       "bg-green-100 text-green-700",
  inactive:       "bg-gray-100 text-gray-400",
  not_interested: "bg-red-50 text-red-500",
};

const NOTE_TYPES: { value: ProspectNoteType; label: string }[] = [
  { value: "note",    label: "Note" },
  { value: "call",    label: "Call" },
  { value: "email",   label: "Email" },
  { value: "visit",   label: "Visit" },
  { value: "meeting", label: "Meeting" },
];

type DrillVisitRow = { id: string; session: { date: string } | null; status: string | null; notes: string | null; pre_logged: boolean };

export function ProspectDetailClient({
  prospect: initialProspect,
  initialNotes,
  initialChecklist,
  drillVisits,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  profile,
}: {
  prospect: Prospect;
  initialNotes: ProspectNote[];
  initialChecklist: ProspectChecklistItem[];
  drillVisits: DrillVisitRow[];
  profile: Profile;
}) {
  const router = useRouter();
  const [prospect, setProspect] = useState(initialProspect);
  const [notes, setNotes] = useState(initialNotes);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [editForm, setEditForm] = useState({ ...initialProspect });
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<ProspectNoteType>("note");
  const [addingNote, setAddingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{ link?: string | null; tempPassword?: string | null } | null>(null);

  const isDirty = JSON.stringify(editForm) !== JSON.stringify(prospect);

  const saveFields = async () => {
    setSaving(true);
    const patch: Partial<Prospect> = {};
    (Object.keys(editForm) as (keyof Prospect)[]).forEach((k) => {
      if (editForm[k] !== prospect[k]) (patch as Record<string, unknown>)[k] = editForm[k];
    });
    if (Object.keys(patch).length === 0) { setSaving(false); return; }
    const result = await updateProspectField(prospect.id, patch as never);
    setSaving(false);
    if ("error" in result) { toast.error(result.error); return; }
    setProspect({ ...prospect, ...editForm });
    toast.success("Saved");
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const result = await addProspectNote(prospect.id, newNote.trim(), noteType);
    setAddingNote(false);
    if ("error" in result) { toast.error(result.error); return; }
    setNotes((n) => [result.note as ProspectNote, ...n]);
    setNewNote("");
    toast.success("Note added");
  };

  const handleToggle = async (item: ProspectChecklistItem) => {
    const newVal = !item.completed;
    setChecklist((c) => c.map((x) => x.id === item.id ? { ...x, completed: newVal } : x));
    const result = await toggleChecklistItem(item.id, newVal);
    if ("error" in result) {
      setChecklist((c) => c.map((x) => x.id === item.id ? { ...x, completed: item.completed } : x));
      toast.error(result.error);
    }
  };

  const handleConvert = async () => {
    if (!confirm(`Convert ${prospect.name} to a cadet profile? This creates a portal account they can activate.`)) return;
    setConverting(true);
    const result = await convertToProfile(prospect.id);
    setConverting(false);
    if ("error" in result) { toast.error(result.error); return; }
    setProspect((p) => ({ ...p, converted_to_profile_id: result.profileId ?? null, status: "enrolled" }));
    setConvertResult({ link: result.link, tempPassword: result.tempPassword });
    toast.success("Cadet profile created");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/recruiting")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Recruiting
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-bold text-gray-900">{prospect.name}</h1>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[prospect.status as ProspectStatus]}`}>
          {STAGES.find((s) => s.value === prospect.status)?.label ?? prospect.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Profile fields */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Profile</p>
              {isDirty && (
                <Button size="sm" onClick={saveFields} disabled={saving} className="h-7 bg-[#003087] hover:bg-[#002266] text-xs">
                  <Save className="h-3 w-3 mr-1" />{saving ? "Saving…" : "Save"}
                </Button>
              )}
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <Label className="text-xs">Stage</Label>
              <Select value={editForm.status ?? "prospect"} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as ProspectStatus }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={editForm.unit ?? ""} onValueChange={(v) => setEditForm((f) => ({ ...f, unit: v || null }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
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
                <Input value={editForm.grade ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, grade: e.target.value || null }))} className="h-8 text-sm" placeholder="9th" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">School</Label>
              <Input value={editForm.school ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, school: e.target.value || null }))} className="h-8 text-sm" />
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guardian</p>
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={editForm.guardian_name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, guardian_name: e.target.value || null }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact</Label>
                <Input value={editForm.guardian_contact ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, guardian_contact: e.target.value || null }))} className="h-8 text-sm" placeholder="Phone or email" />
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prospect</p>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value || null }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={editForm.phone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value || null }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Input value={editForm.source ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value || null }))} className="h-8 text-sm" placeholder="How they found us" />
              </div>
            </div>

            {/* Key dates */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Dates</p>
              {[
                { key: "first_visit_date" as const, label: "First Visit" },
                { key: "application_date" as const, label: "Applied" },
                { key: "enrollment_date" as const, label: "Enrolled" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="date" value={editForm[key] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value || null }))} className="h-8 text-sm" />
                </div>
              ))}
            </div>
          </Card>

          {/* Drill visits */}
          {drillVisits.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Drill Visits ({drillVisits.length})</p>
              <div className="space-y-1.5">
                {drillVisits.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{v.session?.date ? format(parseISO(v.session.date + "T12:00:00"), "EEE d MMM yyyy") : "Unknown date"}</span>
                    {v.pre_logged && <span className="rounded-full bg-[#003087]/10 px-1.5 text-[10px] font-semibold text-[#003087]">Pre-logged</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Notes + Checklist */}
        <div className="lg:col-span-2 space-y-4">
          {/* Convert to Cadet */}
          {(prospect.status === "enrolled" || prospect.status === "applied" || prospect.status === "visited") && !prospect.converted_to_profile_id && (
            <Card className="p-4 border-green-200 bg-green-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-green-800">Ready to join the portal?</p>
                  <p className="text-xs text-green-600 mt-0.5">Convert {prospect.name} to a cadet profile and generate their activation link.</p>
                </div>
                <Button onClick={handleConvert} disabled={converting} size="sm" className="shrink-0 bg-green-700 hover:bg-green-800 text-white">
                  <UserCheck className="h-4 w-4 mr-1.5" />{converting ? "Creating…" : "Convert to Cadet"}
                </Button>
              </div>
            </Card>
          )}

          {prospect.converted_to_profile_id && (
            <Card className="p-4 border-green-200 bg-green-50">
              <p className="text-sm font-semibold text-green-800">✓ Converted to cadet profile</p>
              {convertResult?.link && (
                <div className="mt-2">
                  <p className="text-xs text-green-700 font-medium mb-1">Activation link (share with cadet):</p>
                  <code className="block rounded bg-white border border-green-200 px-2 py-1 text-xs break-all text-gray-700">{convertResult.link}</code>
                  {convertResult.tempPassword && (
                    <p className="mt-1 text-xs text-green-700">Temp password: <strong>{convertResult.tempPassword}</strong></p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Enrollment checklist */}
          {(prospect.status === "enrolled" || checklist.length > 0) && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-4 w-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-700">Enrollment Checklist</p>
                {checklist.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{checklist.filter((i) => i.completed).length}/{checklist.length}</span>
                )}
              </div>
              {checklist.length === 0 && (
                <p className="text-xs text-gray-400 italic">Checklist will appear when prospect is marked Enrolled.</p>
              )}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <button
                      onClick={() => handleToggle(item)}
                      className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${item.completed ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-green-400"}`}
                    >
                      {item.completed && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <span className={`text-sm ${item.completed ? "line-through text-gray-400" : "text-gray-700"}`}>{item.item}</span>
                    {item.completed_at && (
                      <span className="ml-auto text-xs text-gray-300">{format(parseISO(item.completed_at), "d MMM")}</span>
                    )}
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Notes log */}
          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold text-gray-700">Interaction Log</p>
            {/* Add note */}
            <div className="mb-4 space-y-2 rounded-lg border bg-gray-50 p-3">
              <div className="flex gap-2">
                <Select value={noteType} onValueChange={(v) => setNoteType(v as ProspectNoteType)}>
                  <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTE_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea
                rows={2}
                placeholder="Add a note, log a call, record visit details…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-sm resize-none"
              />
              <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="h-7 bg-[#003087] hover:bg-[#002266] text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />{addingNote ? "Saving…" : "Add"}
              </Button>
            </div>

            {notes.length === 0 && <p className="text-xs text-gray-400 italic">No interactions logged yet.</p>}
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">{n.type}</span>
                    <span className="text-xs text-gray-400">{format(parseISO(n.created_at), "d MMM yyyy 'at' HH:mm")}</span>
                    {n.author && <span className="text-xs text-gray-400">· {n.author.rank ? `${n.author.rank} ` : ""}{n.author.full_name}</span>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
