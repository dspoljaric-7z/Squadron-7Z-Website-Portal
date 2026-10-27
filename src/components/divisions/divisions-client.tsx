"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { HintButton, type HintSection } from "@/components/shared/hint-button";

const DIVISIONS_HINTS: HintSection[] = [
  {
    heading: "Creating a Division",
    body: "Click 'New Division,' give it a name (e.g. Alpha, Bravo, Charlie), pick a color, and save. Divisions group cadets under an NCO for attendance and accountability.",
  },
  {
    heading: "Assigning Members",
    body: "Use the 'Assign Members' panel to drag or click cadets into a division. Members can only belong to one division at a time. Unassigned members appear at the top.",
  },
  {
    heading: "NCO Responsibility",
    body: "The NCO assigned to a division is responsible for marking attendance at drill, tracking their cadets' progress, and reporting issues to the OOD or XO.",
  },
  {
    heading: "Editing or Deleting",
    body: "Click the pencil icon on a division to rename it or change its color. Deleting a division unassigns all its members — they will appear as unassigned until re-assigned.",
  },
];
import { initials, lastFirst, byLastName, roleLabel, ROLE_ORDER } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Division, Profile } from "@/types/database";

const DIVISION_COLORS = [
  "#003087", "#B8860B", "#1d6b1d", "#dc2626", "#8b0000", "#4b0082",
  "#006080", "#7a4000", "#555555",
];

type MemberWithDivision = Pick<Profile, "id" | "full_name" | "rank" | "role" | "division_id" | "billet" | "avatar_url">;

export function DivisionsClient({
  profile,
  initialDivisions,
  members,
}: {
  profile: Profile;
  initialDivisions: Division[];
  members: MemberWithDivision[];
}) {
  const [divisions, setDivisions] = useState(initialDivisions);
  const [memberDivisions, setMemberDivisions] = useState<Record<string, string | null>>(
    Object.fromEntries(members.map((m) => [m.id, m.division_id]))
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Division | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: DIVISION_COLORS[0] });
  const [saving, setSaving] = useState(false);
  const [expandedDivs, setExpandedDivs] = useState<Set<string>>(new Set());
  const canEdit = profile.role === "officer" || profile.role === "snco";

  const toggleExpand = (id: string) =>
    setExpandedDivs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", color: DIVISION_COLORS[0] });
    setDialogOpen(true);
  };

  const openEdit = (d: Division) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description ?? "", color: d.color ?? DIVISION_COLORS[0] });
    setDialogOpen(true);
  };

  const saveDivision = async () => {
    if (!form.name.trim()) { toast.error("Division name required"); return; }
    setSaving(true);
    const supabase = createClient();

    if (editing) {
      const { error } = await supabase
        .from("divisions")
        .update({ name: form.name, description: form.description, color: form.color })
        .eq("id", editing.id);
      if (error) { toast.error("Failed to update"); setSaving(false); return; }
      setDivisions((prev) => prev.map((d) => d.id === editing.id ? { ...d, ...form } : d));
      toast.success("Division updated");
    } else {
      const { data, error } = await supabase
        .from("divisions")
        .insert({ name: form.name, description: form.description, color: form.color, created_by: profile.id })
        .select()
        .single();
      if (error || !data) { toast.error("Failed to create"); setSaving(false); return; }
      setDivisions((prev) => [...prev, data]);
      toast.success("Division created");
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const deleteDivision = async (id: string) => {
    const supabase = createClient();
    // Remove all member assignments first
    await supabase.from("profiles").update({ division_id: null }).eq("division_id", id);
    const { error } = await supabase.from("divisions").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setDivisions((prev) => prev.filter((d) => d.id !== id));
    setMemberDivisions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k] === id) next[k] = null; });
      return next;
    });
    toast.success("Division deleted");
  };

  const assignMember = async (memberId: string, divisionId: string | null) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ division_id: divisionId })
      .eq("id", memberId);
    if (error) { toast.error("Failed to assign"); return; }
    setMemberDivisions((prev) => ({ ...prev, [memberId]: divisionId }));
  };

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
  );

  const unassigned = sortedMembers.filter((m) => !memberDivisions[m.id]);

  const handleAssign = async (memberId: string, divisionId: string | null) => {
    await assignMember(memberId, divisionId);
    setEditingMemberId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#003087]">Divisions</h1>
            <HintButton title="Divisions" hints={DIVISIONS_HINTS} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Organize members into operational divisions
          </p>
        </div>
        {canEdit && (
          <Button onClick={openNew} className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1 h-4 w-4" /> New Division
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Divisions</p>
          <p className="mt-1 text-3xl font-extrabold text-[#003087]">{divisions.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assigned</p>
          <p className="mt-1 text-3xl font-extrabold text-green-700">
            {members.filter((m) => memberDivisions[m.id]).length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Unassigned</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-600">{unassigned.length}</p>
        </div>
      </div>

      {/* Division cards — expandable */}
      {divisions.length > 0 && (
        <div className="space-y-3">
          {divisions.map((div) => {
            const divMembers = [...sortedMembers.filter((m) => memberDivisions[m.id] === div.id)].sort(byLastName);
            const expanded = expandedDivs.has(div.id);
            return (
              <Card key={div.id} className="overflow-hidden">
                <div className="h-1.5 w-full" style={{ backgroundColor: div.color ?? "#003087" }} />
                <button
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(div.id)}
                >
                  <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                    <div>
                      <h3 className="font-bold text-gray-900">{div.name}</h3>
                      {div.description && <p className="text-xs text-gray-400">{div.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{divMembers.length}</span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(div)} className="text-gray-400 hover:text-[#003087] p-1">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteDivision(div.id)} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t divide-y">
                    {divMembers.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400">No members assigned.</p>
                    )}
                    {divMembers.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback
                            className="text-[10px] text-white"
                            style={{ backgroundColor: div.color ?? "#003087" }}
                          >
                            {initials(m.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{lastFirst(m.full_name)}</p>
                          <p className="text-xs text-gray-400">
                            {[m.rank, m.billet].filter(Boolean).join(" · ") || roleLabel(m.role)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {divisions.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Layers className="h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-400">No divisions yet</p>
          <Button size="sm" onClick={openNew} className="bg-[#003087] hover:bg-[#002266]">
            Create First Division
          </Button>
        </Card>
      )}

      {/* Member assignment table — visible to officers and SNCOs */}
      {canEdit && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-[#003087]">Assign Members</h2>
          <Card className="divide-y overflow-hidden">
            {[...sortedMembers].sort(byLastName).map((member) => {
              const divId = memberDivisions[member.id];
              const div = divId ? divisions.find((d) => d.id === divId) : null;
              const isEditing = editingMemberId === member.id;
              return (
                <div key={member.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-[#003087] text-xs text-white">
                          {initials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lastFirst(member.full_name)}</p>
                        <p className="text-xs text-gray-400">
                          {[member.rank, member.billet].filter(Boolean).join(" · ") || roleLabel(member.role)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingMemberId(isEditing ? null : member.id)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
                      style={
                        div
                          ? { backgroundColor: (div.color ?? "#003087") + "22", color: div.color ?? "#003087", border: `1px solid ${div.color ?? "#003087"}44` }
                          : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "1px solid #e5e7eb" }
                      }
                    >
                      {div && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: div.color ?? "#003087" }}
                        />
                      )}
                      {div ? div.name : "Unassigned"}
                      <Pencil className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                    </button>
                  </div>
                  {isEditing && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                      <button
                        onClick={() => handleAssign(member.id, null)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          !divId
                            ? "bg-gray-200 text-gray-700 border-gray-300"
                            : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        Unassigned
                      </button>
                      {divisions.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => handleAssign(member.id, d.id)}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                          style={
                            divId === d.id
                              ? { backgroundColor: d.color ?? "#003087", color: "#fff" }
                              : { backgroundColor: (d.color ?? "#003087") + "22", color: d.color ?? "#003087", border: `1px solid ${d.color ?? "#003087"}44` }
                          }
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">No active members found.</p>
            )}
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Division" : "New Division"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Alpha Division"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DIVISION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      form.color === c ? "border-gray-900 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDivision} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Division"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
