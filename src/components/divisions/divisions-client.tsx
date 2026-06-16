"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Layers } from "lucide-react";
import { initials, roleLabel, ROLE_ORDER } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Division, Profile } from "@/types/database";

const DIVISION_COLORS = [
  "#003087", "#B8860B", "#1d6b1d", "#8b0000", "#4b0082",
  "#006080", "#7a4000", "#555555",
];

type MemberWithDivision = Pick<Profile, "id" | "full_name" | "rank" | "role" | "division_id" | "avatar_url">;

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

  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
  );

  const unassigned = sortedMembers.filter((m) => !memberDivisions[m.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003087]">Divisions</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Organize members into operational divisions
          </p>
        </div>
        <Button onClick={openNew} className="bg-[#003087] hover:bg-[#002266]">
          <Plus className="mr-1 h-4 w-4" /> New Division
        </Button>
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

      {/* Division cards */}
      {divisions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {divisions.map((div) => {
            const divMembers = sortedMembers.filter((m) => memberDivisions[m.id] === div.id);
            return (
              <Card key={div.id} className="overflow-hidden">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: div.color ?? "#003087" }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{div.name}</h3>
                      {div.description && (
                        <p className="mt-0.5 text-xs text-gray-400">{div.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(div)} className="text-gray-400 hover:text-[#003087]">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteDivision(div.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>{divMembers.length} member{divMembers.length !== 1 ? "s" : ""}</span>
                  </div>
                  {divMembers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {divMembers.slice(0, 5).map((m) => (
                        <Avatar key={m.id} className="h-7 w-7">
                          <AvatarFallback
                            className="text-[10px] text-white"
                            style={{ backgroundColor: div.color ?? "#003087" }}
                          >
                            {initials(m.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {divMembers.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500">
                          +{divMembers.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Member assignment table */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-[#003087]">Assign Members</h2>
        <Card className="divide-y overflow-hidden">
          {sortedMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-[#003087] text-xs text-white">
                    {initials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.full_name}</p>
                  <p className="text-xs text-gray-400">
                    {member.rank ?? roleLabel(member.role)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {memberDivisions[member.id] && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        divisions.find((d) => d.id === memberDivisions[member.id])?.color ?? "#003087",
                    }}
                  />
                )}
                <Select
                  value={memberDivisions[member.id] ?? "none"}
                  onValueChange={(v) => assignMember(member.id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-400">— Unassigned —</span>
                    </SelectItem>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">No approved members found.</p>
          )}
        </Card>
      </div>

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
