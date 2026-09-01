"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials, roleLabel } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Check, Image as ImageIcon, Copy, CheckCheck, Users, UserCheck, Shield, Search, Pencil, Mail, Send, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { InviteCode, Profile, SiteSettings, UserRole, DocumentRow } from "@/types/database";
import { sendEmailInvite, sendBulkInvites, activateCadet, updateCadetProfile, deactivateCadet } from "@/app/(app)/settings/actions";
import { format } from "date-fns";

const ROLES: UserRole[] = ["cadet", "nco", "snco", "officer"];

type Division = { id: string; name: string };

export function AdminClient({
  profile,
  initialUsers,
  initialInviteCodes,
  initialSettings,
  divisions,
}: {
  profile: Profile;
  initialUsers: Profile[];
  initialInviteCodes: InviteCode[];
  initialSettings: SiteSettings | null;
  divisions: Division[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [codes, setCodes] = useState(initialInviteCodes);
  const [settings, setSettings] = useState<SiteSettings>(
    initialSettings ?? { id: 1, unit_name: "", motto: "", logo_url: null, auto_approve_registrations: false }
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setUsers(data));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invite_codes" }, () => {
        supabase.from("invite_codes").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setCodes(data));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, (payload) => {
        setSettings(payload.new as SiteSettings);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pendingCount = users.filter((u) => !u.approved).length;
  const officerCount = users.filter((u) => u.role === "officer" && u.approved).length;
  const activeCount = users.filter((u) => u.approved && u.active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          <LiveIndicator />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-[#003087]" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Active</span>
          </div>
          <p className="text-3xl font-bold text-[#003087]">{activeCount}</p>
        </Card>
        <Card className={`p-4 ${pendingCount > 0 ? "ring-1 ring-[#B8860B]/30 bg-[#B8860B]/[0.03]" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-4 w-4 text-[#B8860B]" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Pending</span>
          </div>
          <p className="text-3xl font-bold text-[#B8860B]">{pendingCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-[#003087]" />
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Officers</span>
          </div>
          <p className="text-3xl font-bold text-[#003087]">{officerCount}</p>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="activate">
              <Zap className="mr-1 h-3.5 w-3.5" />Activate Cadets
            </TabsTrigger>
            <TabsTrigger value="users">
              Users {pendingCount > 0 && <Badge className="ml-1 bg-[#B8860B] text-white">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="invites">Invite Codes</TabsTrigger>
            <TabsTrigger value="email-invite"><Mail className="mr-1 h-3.5 w-3.5" />Email Invite</TabsTrigger>
            <TabsTrigger value="bulk-invite">Bulk Import</TabsTrigger>
            <TabsTrigger value="doc-access">Doc Access</TabsTrigger>
            <TabsTrigger value="settings">Site Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="activate" className="mt-4">
          <ActivateTab users={users} divisions={divisions} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab users={users} currentUserId={profile.id} currentUserRole={profile.role} />
        </TabsContent>
        <TabsContent value="invites">
          <InvitesTab codes={codes} profile={profile} />
        </TabsContent>
        <TabsContent value="email-invite" className="mt-4">
          <EmailInviteTab />
        </TabsContent>
        <TabsContent value="bulk-invite" className="mt-4">
          <BulkInviteTab />
        </TabsContent>
        <TabsContent value="doc-access" className="mt-4">
          <DocAccessTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab settings={settings} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Activate Cadets Tab ─────────────────────────────────────────────────────

const RANKS = ["RC", "SR", "SA", "AA", "AR", "SN", "AN", "PO3", "LC4", "PO2", "LC5", "PO1", "LC6", "CPO", "ABC", "LC3", "LC2", "LC1", "APC", "SLPO", "LTJG", "ENS", "LCDR"];

function ActivateTab({ users, divisions }: { users: Profile[]; divisions: Division[] }) {
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Record<string, { link?: string; email?: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ rank: string; billet: string; division_id: string | null; role: UserRole }>({ rank: "", billet: "", division_id: null, role: "cadet" });
  const [saving, setSaving] = useState(false);

  // Exclude officers from this view — they're already set up
  const cadets = useMemo(() =>
    users
      .filter((u) => u.role !== "officer" && !u.email?.endsWith("@sq7z.org"))
      .filter((u) => !search || u.full_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [users, search]
  );

  const activatedCount = cadets.filter((u) => u.approved).length;

  const startEdit = (u: Profile) => {
    setEditing(u.id);
    setEditDraft({
      rank: u.rank ?? "",
      billet: u.billet ?? "",
      division_id: (u as unknown as { division_id?: string }).division_id ?? null,
      role: u.role as UserRole,
    });
  };

  const saveEdit = async (u: Profile) => {
    setSaving(true);
    const res = await updateCadetProfile(u.id, {
      rank: editDraft.rank || undefined,
      billet: editDraft.billet || undefined,
      role: editDraft.role,
      division_id: editDraft.division_id || null,
    });
    setSaving(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("Profile updated");
    setEditing(null);
  };

  const handleDeactivate = async (u: Profile) => {
    if (!confirm(`Deactivate ${u.full_name}? They will lose portal access immediately.`)) return;
    setDeactivating(u.id);
    const res = await deactivateCadet(u.id);
    setDeactivating(null);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(`${u.full_name} deactivated`);
  };

  const handleActivate = async (u: Profile) => {
    setActivating(u.id);
    const res = await activateCadet(u.id);
    setActivating(null);
    if (res?.error) { toast.error(res.error); return; }
    setActivated((prev) => ({ ...prev, [u.id]: { link: res.link, email: res.email } }));
    toast.success(`Activation link generated for ${u.full_name}`);
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>How it works:</strong> Build out each cadet (division, rank, billet), then click <strong>Activate</strong> to generate their login link. You can copy the link and send it however you want — email, text, Discord. They click it, set a password, and they&apos;re in.
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search cadets…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">{activatedCount} / {cadets.length} activated</span>
      </div>

      <Card className="divide-y">
        {cadets.map((u) => {
          const isEditing = editing === u.id;
          const isActivating = activating === u.id;
          const isDeactivating = deactivating === u.id;
          const result = activated[u.id];
          const divisionName = divisions.find((d) => d.id === (u as unknown as { division_id?: string }).division_id)?.name;

          return (
            <div key={u.id} className="p-3 space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-[#003087] text-xs text-white">{initials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {!isEditing && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[u.rank, divisionName, u.billet].filter(Boolean).join(" · ") || <span className="italic text-gray-300">No details yet</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {u.approved && u.active && !result && <Badge className="bg-green-600 text-white text-xs">Activated</Badge>}
                  {!u.active && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                  <Button size="sm" variant="outline" onClick={() => isEditing ? setEditing(null) : startEdit(u)}>
                    <Pencil className="mr-1 h-3 w-3" />{isEditing ? "Cancel" : "Edit"}
                  </Button>
                  {u.active ? (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(u)}
                      disabled={isActivating}
                      className={u.approved && !result ? "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200" : "bg-[#003087] hover:bg-[#002266] text-white"}
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      {isActivating ? "Generating…" : u.approved && !result ? "Re-send Link" : "Activate"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(u)}
                      disabled={isActivating}
                      className="bg-[#003087] hover:bg-[#002266] text-white"
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      {isActivating ? "Generating…" : "Reactivate"}
                    </Button>
                  )}
                  {u.active && u.approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(u)}
                      disabled={isDeactivating}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {isDeactivating ? "…" : "Deactivate"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="pl-12 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-400">Rank</Label>
                    <Select value={editDraft.rank ?? ""} onValueChange={(v) => setEditDraft((p) => ({ ...p, rank: v ?? "" }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Rank" /></SelectTrigger>
                      <SelectContent>{RANKS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-400">Division</Label>
                    <Select value={editDraft.division_id ?? ""} onValueChange={(v) => setEditDraft((p) => ({ ...p, division_id: v || null }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Division" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-400">Billet</Label>
                    <Input
                      className="h-8 text-xs"
                      value={editDraft.billet}
                      onChange={(e) => setEditDraft((p) => ({ ...p, billet: e.target.value }))}
                      placeholder="e.g. DPO, MAA"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-400">Role</Label>
                    <Select value={editDraft.role} onValueChange={(v) => setEditDraft((p) => ({ ...p, role: v as UserRole }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-4 flex justify-end">
                    <Button size="sm" onClick={() => saveEdit(u)} disabled={saving} className="bg-[#003087] hover:bg-[#002266] text-white">
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Activation result */}
              {result && (
                <div className="pl-12 rounded-md border border-green-200 bg-green-50 p-2 text-xs space-y-1">
                  <p className="font-semibold text-green-800">Link generated for {result.email}</p>
                  <p className="text-green-700 break-all font-mono text-[10px]">{result.link}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => copyLink(result.link!)}>
                      <Copy className="mr-1 h-3 w-3" />Copy Link
                    </Button>
                    <a href={`mailto:${result.email}?subject=Your SQ7Z Portal Login&body=Hi,%0A%0AYour portal account is ready. Click the link below to set your password and log in:%0A%0A${encodeURIComponent(result.link!)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        <ExternalLink className="mr-1 h-3 w-3" />Open Email Draft
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {cadets.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No cadets found.</p>}
      </Card>
    </div>
  );
}

function TitleEditor({ userId, initial }: { userId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);

  const save = async () => {
    setEditing(false);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ billet: value || null }).eq("id", userId);
    if (error) toast.error("Failed to save title");
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
      >
        <Pencil className="h-3 w-3" />
        {value || <span className="italic">Add title...</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && save()}
      placeholder="e.g. Executive Officer"
      className="mt-0.5 w-full rounded border px-1.5 py-0.5 text-xs text-gray-700 outline-none focus:border-[#003087] focus:ring-0"
    />
  );
}

function UsersTab({ users, currentUserId, currentUserRole }: { users: Profile[]; currentUserId: string; currentUserRole: UserRole }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && !u.approved) ||
        (filter === "active" && u.approved && u.active);
      return matchesSearch && matchesFilter;
    });
  }, [users, search, filter]);

  const pending = users.filter((u) => !u.approved);

  const updateRole = async (id: string, role: UserRole) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) toast.error("Failed to update role");
    else toast.success("Role updated");
  };

  const approve = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) toast.error("Failed to approve");
    else toast.success("User approved");
  };

  const approveAll = async () => {
    const supabase = createClient();
    const ids = pending.map((u) => u.id);
    const { error } = await supabase.from("profiles").update({ approved: true }).in("id", ids);
    if (error) toast.error("Failed to approve all");
    else toast.success(`Approved ${ids.length} user${ids.length !== 1 ? "s" : ""}`);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ active: !active }).eq("id", id);
    if (error) toast.error("Failed to update");
  };

  const toggleFlag = async (id: string, field: "is_command" | "is_maa", current: boolean) => {
    const supabase = createClient();
    const patch = field === "is_command" ? { is_command: !current } : { is_maa: !current };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) toast.error("Failed to update");
    else toast.success(`${field === "is_command" ? "Command" : "MAA"} access ${!current ? "granted" : "removed"}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex rounded-md border bg-white p-0.5 text-sm">
          {(["all", "pending", "active"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-sm px-3 py-1 capitalize transition-colors ${filter === f ? "bg-[#003087] text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {pending.length > 1 && (
          <Button size="sm" className="bg-[#B8860B] hover:bg-[#9a7209] text-white" onClick={approveAll}>
            <CheckCheck className="mr-1 h-3 w-3" /> Approve All ({pending.length})
          </Button>
        )}
      </div>

      <Card className="divide-y">
        {filtered.map((u) => (
          <div key={u.id} className="p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[#003087] text-xs text-white">{initials(u.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.full_name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  <TitleEditor userId={u.id} initial={u.billet ?? ""} />
                </div>
                {!u.approved && <Badge className="bg-[#B8860B] text-white">Pending</Badge>}
                {!u.active && <Badge variant="destructive">Deactivated</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {!u.approved && (
                  <Button size="sm" variant="outline" onClick={() => approve(u.id)}>
                    <Check className="mr-1 h-3 w-3" /> Approve
                  </Button>
                )}
                <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)} disabled={u.id === currentUserId}>
                  <SelectTrigger className="w-36"><SelectValue>{roleLabel(u.role)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={u.id === currentUserId} onClick={() => toggleActive(u.id, u.active)}>
                  {u.active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
            {/* Portal access flags — officers only */}
            {currentUserRole === "officer" && (
              <div className="flex flex-wrap items-center gap-2 pl-12">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Access:</span>
                {(["is_command", "is_maa"] as const).map((flag) => {
                  const on = u[flag];
                  const label = flag === "is_command" ? "Command" : "MAA";
                  const hint = flag === "is_command" ? "Corrections · PIPs · Issues" : "Uniform Inspections";
                  return (
                    <button
                      key={flag}
                      title={hint}
                      onClick={() => toggleFlag(u.id, flag, on)}
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                        on
                          ? "border-[#003087] bg-[#003087] text-white"
                          : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                      }`}
                    >
                      {on && <Check className="h-2.5 w-2.5" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-4 text-sm text-gray-400">No users match that search.</p>}
      </Card>
    </div>
  );
}

function InvitesTab({ codes, profile }: { codes: InviteCode[]; profile: Profile }) {
  const [role, setRole] = useState<UserRole>("cadet");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copied to clipboard");
  };

  const generate = async () => {
    setGenerating(true);
    const code = `SQ7Z-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const supabase = createClient();
    const { error } = await supabase.from("invite_codes").insert({
      code,
      role_grant: role,
      created_by: profile.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
    });
    setGenerating(false);
    if (error) {
      toast.error("Failed to generate code");
      return;
    }
    await navigator.clipboard.writeText(code).catch(() => {});
    toast.success(`Code created & copied: ${code}`);
  };

  const revoke = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("invite_codes").update({ used: true }).eq("id", id);
    if (error) toast.error("Failed to revoke");
    else toast.success("Code revoked");
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger className="w-40"><SelectValue>{roleLabel(role)}</SelectValue></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="bg-[#003087] hover:bg-[#002266]" onClick={generate} disabled={generating}>
          <Plus className="mr-1 h-4 w-4" /> Generate &amp; Copy Code
        </Button>
        <p className="text-xs text-gray-400">Codes expire in 90 days. Auto-copied to clipboard on creation.</p>
      </Card>

      <Card className="divide-y">
        {codes.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-medium">{c.code}</p>
                {!c.used && (
                  <button
                    onClick={() => copyCode(c.code)}
                    className="text-gray-400 hover:text-[#003087] transition-colors"
                    title="Copy code"
                  >
                    {copied === c.code
                      ? <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Grants <span className="capitalize">{c.role_grant}</span>
                {c.expires_at && ` · Expires ${format(new Date(c.expires_at), "MMM d, yyyy")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {c.used ? <Badge variant="outline">Used / Revoked</Badge> : <Badge className="bg-green-600 text-white">Active</Badge>}
              {!c.used && (
                <Button size="sm" variant="outline" onClick={() => revoke(c.id)}>Revoke</Button>
              )}
              <button onClick={() => remove(c.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {codes.length === 0 && <p className="p-4 text-sm text-gray-400">No invite codes yet. Generate one above to invite cadets.</p>}
      </Card>
    </div>
  );
}

function SettingsTab({ settings, profile }: { settings: SiteSettings; profile: Profile }) {
  const [unitName, setUnitName] = useState(settings.unit_name);
  const [motto, setMotto] = useState(settings.motto);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [autoApprove, setAutoApprove] = useState(settings.auto_approve_registrations);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("site_settings").update({
      unit_name: unitName, motto, logo_url: logoUrl || null, auto_approve_registrations: autoApprove,
    }).eq("id", 1);
    if (error) {
      toast.error("Failed to save settings");
      return;
    }
    toast.success("Settings saved");
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const path = `logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Logo upload failed");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("site").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  return (
    <div className="max-w-xl space-y-4">
      {/* Unit Identity */}
      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Unit Identity</h3>
          <p className="text-xs text-gray-400 mt-0.5">Displayed across the portal and public landing page.</p>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Unit Name</Label>
            <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="e.g. Squadron 7-Zulu & TS Wasp" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Motto</Label>
            <Input value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Unit motto..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Unit Logo</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-full border object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed bg-gray-50">
                  <ImageIcon className="h-5 w-5 text-gray-300" />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <ImageIcon className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload image"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Access Control */}
      <Card className="overflow-hidden">
        <div className="border-b bg-gray-50/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Access Control</h3>
          <p className="text-xs text-gray-400 mt-0.5">Control how new members join the portal.</p>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Auto-approve registrations</p>
            <p className="text-xs text-gray-400 mt-0.5">New sign-ups are approved instantly — no officer review needed.</p>
          </div>
          <Switch id="auto-approve" checked={autoApprove} onCheckedChange={setAutoApprove} />
        </div>
      </Card>

      <Button
        className="bg-[#003087] hover:bg-[#002266]"
        onClick={save}
        disabled={profile.role !== "officer"}
      >
        Save Settings
      </Button>
    </div>
  );
}

// ─── Email Invite Tab ────────────────────────────────────────────────────────

function EmailInviteTab() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [rank, setRank] = useState("");
  const [role, setRole] = useState<UserRole>("cadet");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("full_name", fullName);
    fd.set("rank", rank);
    fd.set("role", role);
    const res = await sendEmailInvite(fd);
    setSending(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(`Invite sent to ${email}`);
    setSent((prev) => [...prev, email]);
    setEmail(""); setFullName(""); setRank("");
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Invite a Cadet or Staff Member</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            They&apos;ll receive an email with a link to set their password and join the portal.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cadet@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Last, First" />
          </div>
          <div className="space-y-1">
            <Label>Rank</Label>
            <Input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="e.g. PO2, SN, RC" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole((v ?? "cadet") as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={send} disabled={sending || !email.trim()} className="bg-[#003087] hover:bg-[#002266]">
          <Send className="mr-1.5 h-4 w-4" />
          {sending ? "Sending…" : "Send Invite"}
        </Button>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Requires <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in .env.local to send real emails.
        </p>
      </Card>

      {sent.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Sent this session:</p>
          <div className="space-y-1">
            {sent.map((e) => (
              <div key={e} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCheck className="h-4 w-4 text-green-500 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Document Access Tab ─────────────────────────────────────────────────────

const DOC_ROLES: { value: UserRole; label: string }[] = [
  { value: "cadet", label: "Cadets" },
  { value: "nco", label: "NCOs" },
  { value: "snco", label: "SNCOs" },
  { value: "officer", label: "Officers" },
];

const BILLET_ACCESS_OPTIONS = ["MAA", "LPO", "ALPO", "DPO", "ADPO", "Command Chief", "Operations Petty Officer", "Corpsman", "Supply", "Color Guard Captain", "Yeoman Muster", "PT"];

function DocAccessTab() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    createClient().from("documents").select("*").order("folder").order("name").then(({ data }) => {
      setDocuments(data ?? []);
      setLoaded(true);
    });
  }, []);

  // Group by folder
  const folders = useMemo(() => {
    const map = new Map<string, DocumentRow[]>();
    documents.forEach((d) => {
      const list = map.get(d.folder) ?? [];
      list.push(d);
      map.set(d.folder, list);
    });
    return map;
  }, [documents]);

  const toggleRole = async (doc: DocumentRow, role: UserRole) => {
    const current = doc.access_roles ?? [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setSaving(doc.id);
    await createClient().from("documents").update({ access_roles: next.length ? next : null } as never).eq("id", doc.id);
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, access_roles: next.length ? next : null } : d));
    setSaving(null);
  };

  const toggleBillet = async (doc: DocumentRow, billet: string) => {
    const current = doc.access_billets ?? [];
    const next = current.includes(billet) ? current.filter((b) => b !== billet) : [...current, billet];
    setSaving(doc.id);
    await createClient().from("documents").update({ access_billets: next.length ? next : null } as never).eq("id", doc.id);
    setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, access_billets: next.length ? next : null } : d));
    setSaving(null);
  };

  if (!loaded) return <div className="text-sm text-gray-400 py-6 text-center">Loading documents…</div>;
  if (folders.size === 0) return <div className="text-sm text-gray-400 py-6 text-center">No documents uploaded yet.</div>;

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <strong>Access rules:</strong> If no roles are checked, everyone can see the document. If roles are checked, only those roles (plus any matching billet) can see it. Officers always see all documents.
      </div>
      {Array.from(folders.entries()).map(([folder, docs]) => (
        <div key={folder}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{folder}</h3>
          <div className="space-y-2">
            {docs.map((doc) => {
              const docRoles = doc.access_roles ?? [];
              const docBillets = doc.access_billets ?? [];
              const isSaving = saving === doc.id;
              return (
                <Card key={doc.id} className={`p-3 ${isSaving ? "opacity-60" : ""}`}>
                  <p className="text-sm font-medium text-gray-900 mb-3">{doc.name}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Roles with access</p>
                    <div className="flex flex-wrap gap-2">
                      {DOC_ROLES.map(({ value, label }) => {
                        const checked = docRoles.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleRole(doc, value)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              checked ? "border-[#003087] bg-[#003087] text-white" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-2">Billet access (overrides role)</p>
                    <div className="flex flex-wrap gap-2">
                      {BILLET_ACCESS_OPTIONS.map((billet) => {
                        const checked = docBillets.includes(billet);
                        return (
                          <button
                            key={billet}
                            onClick={() => toggleBillet(doc, billet)}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                              checked ? "border-amber-500 bg-amber-500 text-white" : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                            }`}
                          >
                            {checked && <Check className="h-2.5 w-2.5" />}
                            {billet}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bulk Invite Tab ──────────────────────────────────────────────────────────

type RosterEntry = { full_name: string; rank: string; role: UserRole; email: string; sent?: boolean; error?: string };

const ROSTER_TEMPLATE: Omit<RosterEntry, "email" | "sent" | "error">[] = [
  { full_name: "Barnum, Izaak",            rank: "RC",    role: "cadet" },
  { full_name: "Bertolina, Otto",           rank: "SA",    role: "cadet" },
  { full_name: "Bertolina, Ava",            rank: "PO3",   role: "cadet" },
  { full_name: "Blair, Shanen",             rank: "SN",    role: "cadet" },
  { full_name: "Cassidy, Sean",             rank: "PO1",   role: "nco" },
  { full_name: "Cawley, Cain",              rank: "SN",    role: "cadet" },
  { full_name: "Danner, Stephen",           rank: "SR",    role: "cadet" },
  { full_name: "Ford, Jack",                rank: "SR",    role: "cadet" },
  { full_name: "Ford, Edward",              rank: "SR",    role: "cadet" },
  { full_name: "Genereux, Maxwell",         rank: "SA",    role: "cadet" },
  { full_name: "Gladchenko, Artem",         rank: "SA",    role: "cadet" },
  { full_name: "Greene, Aidan",             rank: "PO3",   role: "cadet" },
  { full_name: "Humphreys, Shane",          rank: "SR",    role: "cadet" },
  { full_name: "Jeannot, Mario",            rank: "RC",    role: "cadet" },
  { full_name: "Jones, James",              rank: "APC",   role: "cadet" },
  { full_name: "Kehoe, Ronan",              rank: "APC",   role: "cadet" },
  { full_name: "Kosh, Alyssa",              rank: "SN",    role: "cadet" },
  { full_name: "Kurtz, Trevor",             rank: "PO3",   role: "cadet" },
  { full_name: "Lee, Andrew",               rank: "SA",    role: "cadet" },
  { full_name: "MacDonald, John",           rank: "SR",    role: "cadet" },
  { full_name: "McCarthy, Scarlett",        rank: "SR",    role: "cadet" },
  { full_name: "Meagher, Hamparsoum",       rank: "PO3",   role: "cadet" },
  { full_name: "Mohanty, Adya",             rank: "RC",    role: "cadet" },
  { full_name: "Moreno, Jamari",            rank: "PO1",   role: "snco" },
  { full_name: "Nguyen, An",                rank: "SR",    role: "cadet" },
  { full_name: "Pattinson, Harry",          rank: "PO1",   role: "snco" },
  { full_name: "Plew, Aurora",              rank: "ABC",   role: "cadet" },
  { full_name: "Plew, Calvin",              rank: "ABC",   role: "cadet" },
  { full_name: "Renaud, Lincoln",           rank: "PO2",   role: "nco" },
  { full_name: "Sanden, Gregory",           rank: "SA",    role: "cadet" },
  { full_name: "Santiago Lee, Adam",        rank: "SA",    role: "cadet" },
  { full_name: "Satish, Mayur",             rank: "RC",    role: "cadet" },
  { full_name: "Sham, Kodiak",              rank: "PO3",   role: "cadet" },
  { full_name: "Speck, Colin",              rank: "SN",    role: "cadet" },
  { full_name: "Spoljaric, Dario",          rank: "CPO",   role: "snco" },
  { full_name: "Tobin, Kevin",              rank: "SA",    role: "cadet" },
  { full_name: "Troughton, Arlan",          rank: "SLPO",  role: "snco" },
  { full_name: "Vaghela, Aaravsinh",        rank: "CPO",   role: "snco" },
  { full_name: "Vigneshwaran, Darshika",    rank: "PO2",   role: "nco" },
  { full_name: "Vu, Long",                  rank: "APC",   role: "cadet" },
  { full_name: "Wang, Aaron",               rank: "SA",    role: "cadet" },
  { full_name: "Williams, Zachary",         rank: "SN",    role: "cadet" },
  { full_name: "Yordanov, Philip",          rank: "RC",    role: "cadet" },
  { full_name: "Zammit, Sean",              rank: "SN",    role: "cadet" },
  { full_name: "Zammit, Luke",              rank: "ABC",   role: "cadet" },
  { full_name: "Zegunia, Dominik",          rank: "RC",    role: "cadet" },
  { full_name: "Desmarais, Bill",           rank: "LTJG",  role: "officer" },
  { full_name: "Meagher, Dave",             rank: "ENS",   role: "officer" },
];

function BulkInviteTab() {
  const [roster, setRoster] = useState<RosterEntry[]>(ROSTER_TEMPLATE.map((r) => ({ ...r, email: "" })));
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[]>([]);

  const updateEmail = (idx: number, email: string) => {
    setRoster((prev) => prev.map((r, i) => i === idx ? { ...r, email } : r));
  };

  const readyCount = roster.filter((r) => r.email.trim()).length;

  const sendAll = async () => {
    const toSend = roster.filter((r) => r.email.trim());
    if (!toSend.length) return;
    setSending(true);
    const res = await sendBulkInvites(toSend.map((r) => ({ email: r.email.trim(), full_name: r.full_name, rank: r.rank, role: r.role })));
    setSending(false);
    if ("error" in res) { toast.error(res.error); return; }
    setResults(res.results ?? []);
    const successCount = res.results?.filter((r) => r.success).length ?? 0;
    toast.success(`Sent ${successCount} of ${toSend.length} invites`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900">Roster Bulk Invite</h3>
        <p className="text-sm text-gray-500 mt-1">
          Enter each cadet&apos;s email — rank and role are pre-filled from the unit roster. Leave email blank to skip a cadet.
        </p>
      </Card>

      <Card className="divide-y">
        {roster.map((entry, idx) => (
          <div key={entry.full_name} className="flex items-center gap-3 px-3 py-2">
            <div className="w-32 shrink-0">
              <p className="text-xs font-medium text-gray-800 truncate">{entry.full_name}</p>
              <p className="text-[11px] text-gray-400">{entry.rank} · {entry.role}</p>
            </div>
            <Input
              type="email"
              placeholder="email@school.edu"
              value={entry.email}
              onChange={(e) => updateEmail(idx, e.target.value)}
              className="h-8 text-sm"
            />
            {results.find((r) => r.email === entry.email) && (
              results.find((r) => r.email === entry.email)?.success
                ? <CheckCheck className="h-4 w-4 shrink-0 text-green-500" />
                : <span className="text-[10px] text-red-500 shrink-0">fail</span>
            )}
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={sendAll}
          disabled={sending || readyCount === 0}
          className="bg-[#003087] hover:bg-[#002266]"
        >
          <Send className="mr-1.5 h-4 w-4" />
          {sending ? "Sending…" : `Send ${readyCount} Invite${readyCount !== 1 ? "s" : ""}`}
        </Button>
        <p className="text-xs text-gray-400">{readyCount} of {roster.length} emails filled in</p>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        Requires <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in .env.local to send real emails.
      </p>
    </div>
  );
}
