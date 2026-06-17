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
import { Plus, Trash2, Check, Image as ImageIcon, Copy, CheckCheck, Users, UserCheck, Shield, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { InviteCode, Profile, SiteSettings, UserRole } from "@/types/database";
import { format } from "date-fns";

const ROLES: UserRole[] = ["cadet", "nco", "snco", "officer", "parent"];

export function AdminClient({
  profile,
  initialUsers,
  initialInviteCodes,
  initialSettings,
}: {
  profile: Profile;
  initialUsers: Profile[];
  initialInviteCodes: InviteCode[];
  initialSettings: SiteSettings | null;
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
        <TabsList>
          <TabsTrigger value="users">
            Users {pendingCount > 0 && <Badge className="ml-1 bg-[#B8860B] text-white">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invites">Invite Codes</TabsTrigger>
          <TabsTrigger value="settings">Site Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab users={users} currentUserId={profile.id} />
        </TabsContent>
        <TabsContent value="invites">
          <InvitesTab codes={codes} profile={profile} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab settings={settings} profile={profile} />
        </TabsContent>
      </Tabs>
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

function UsersTab({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
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
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
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
