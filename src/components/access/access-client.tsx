"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Key, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Profile, AllowedEmail, UserRole } from "@/types/database";

type AllowedRow = AllowedEmail;
type ProfileRow = Pick<Profile, "id" | "full_name" | "role" | "is_command" | "is_maa" | "active" | "approved"> & { email: string };

const ROLE_LABELS: Record<UserRole, string> = {
  cadet: "Cadet",
  nco: "NCO",
  snco: "SNCO",
  officer: "Officer",
  parent: "Parent",
};

const ROLE_COLORS: Record<UserRole, string> = {
  cadet: "bg-gray-100 text-gray-700",
  nco: "bg-blue-100 text-blue-700",
  snco: "bg-indigo-100 text-indigo-700",
  officer: "bg-purple-100 text-purple-700",
  parent: "bg-green-100 text-green-700",
};

export function AccessClient({
  initialAllowed,
  profiles,
  currentProfile,
}: {
  initialAllowed: AllowedRow[];
  profiles: ProfileRow[];
  currentProfile: Profile;
}) {
  const [allowed, setAllowed] = useState(initialAllowed);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", role: "cadet" as UserRole, full_name: "" });
  const [search, setSearch] = useState("");

  const filteredProfiles = profiles.filter(
    (p) =>
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const addEmail = async () => {
    if (!form.email) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("allowed_emails")
      .insert({ email: form.email.toLowerCase().trim(), role: form.role, full_name: form.full_name || null } as never)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setAllowed((prev) => [data as AllowedRow, ...prev]);
    setShowAdd(false);
    setForm({ email: "", role: "cadet", full_name: "" });
    toast.success("Email added to allow list");
  };

  const removeEmail = async (id: string) => {
    if (!confirm("Remove this email from the allow list? The user will no longer be able to sign in.")) return;
    const supabase = createClient();
    await supabase.from("allowed_emails").delete().eq("id", id);
    setAllowed((prev) => prev.filter((e) => e.id !== id));
    toast.success("Removed");
  };

  const updateRole = async (profileId: string, role: UserRole) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
    if (error) { toast.error(error.message); return; }
    toast.success("Role updated");
  };

  const toggleFlag = async (profileId: string, field: "is_command" | "is_maa", current: boolean) => {
    const supabase = createClient();
    await supabase.from("profiles").update({ [field]: !current } as never).eq("id", profileId);
    toast.success(`${field === "is_command" ? "Command" : "MAA"} flag ${!current ? "granted" : "revoked"}`);
  };

  const filteredAllowed = allowed.filter(
    (e) =>
      !search ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#003087]" />
            <h1 className="text-xl font-bold text-gray-900">Access Control</h1>
            <Badge className="bg-red-100 text-red-700 border-red-200">Command Only</Badge>
          </div>
          <p className="text-sm text-gray-500">{allowed.length} allowed emails · {profiles.length} active profiles</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Email
        </Button>
      </div>

      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Tabs defaultValue="allowed">
        <TabsList>
          <TabsTrigger value="allowed">Allow List ({allowed.length})</TabsTrigger>
          <TabsTrigger value="profiles">Active Profiles ({profiles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="allowed" className="mt-3 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Only emails on this list can sign in via Google OAuth. Add an email before asking someone to join.
          </p>
          {filteredAllowed.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              No emails on the allow list yet. Add one to grant portal access.
            </div>
          )}
          {filteredAllowed.map((entry) => {
            const hasProfile = profiles.some((p) => p.email === entry.email);
            return (
              <Card key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    {entry.full_name && <p className="text-sm font-semibold text-gray-900 truncate">{entry.full_name}</p>}
                    <p className="text-sm text-gray-500 truncate">{entry.email}</p>
                  </div>
                  <Badge className={ROLE_COLORS[entry.role as UserRole]}>{ROLE_LABELS[entry.role as UserRole]}</Badge>
                  {hasProfile ? (
                    <Badge className="bg-green-100 text-green-700 shrink-0"><UserCheck className="h-3 w-3 mr-1" />Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 text-xs shrink-0">Pending</Badge>
                  )}
                </div>
                <button onClick={() => removeEmail(entry.id)} className="text-red-400 hover:text-red-600 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="profiles" className="mt-3 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Manage roles and command/MAA flags for users who have already signed in.
          </p>
          {filteredProfiles.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{p.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select defaultValue={p.role} onValueChange={(v) => updateRole(p.id, v as UserRole)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant={p.is_command ? "default" : "outline"}
                    className={`h-7 text-xs gap-1 ${p.is_command ? "bg-[#003087] hover:bg-[#002266]" : ""}`}
                    onClick={() => toggleFlag(p.id, "is_command", !!p.is_command)}
                    disabled={p.id === currentProfile.id}
                  >
                    <Shield className="h-3 w-3" /> Command
                  </Button>
                  <Button
                    size="sm"
                    variant={p.is_maa ? "default" : "outline"}
                    className={`h-7 text-xs gap-1 ${p.is_maa ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                    onClick={() => toggleFlag(p.id, "is_maa", !!p.is_maa)}
                  >
                    MAA
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add to Allow List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cadet@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name (optional)</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Will pre-fill their profile"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addEmail} disabled={saving || !form.email} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Adding…" : "Add Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
