"use client";

import { useState, useTransition, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Shield, CheckCircle2, Bell, Building2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, changePassword, updateNotificationTemplate, getNotificationTemplates, getUnitSettings, updateUnitSettings } from "@/app/(app)/settings/actions";
import { roleLabel } from "@/lib/format";
import type { Profile } from "@/types/database";
import { useSearchParams } from "next/navigation";
import React from "react";

type NotifTemplate = { id: string; key: string; label: string; description: string | null; title_template: string; body_template: string };

export function SettingsClient({ profile }: { profile: Profile }) {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";

  // Profile form
  const [preferredName, setPreferredName] = useState(profile.preferred_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.contact_phone ?? "");
  const [profilePending, startProfileTransition] = useTransition();

  // Tab state
  const [settingsTab, setSettingsTab] = useState<string>(isWelcome ? "password" : "profile");

  // Notification templates (officer only)
  const [templates, setTemplates] = useState<NotifTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<NotifTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Unit settings (command only)
  type UnitSettings = { id?: string; unit_name?: string; unit_number?: string; default_drill_location?: string; unit_motto?: string; contact_email?: string; contact_phone?: string };
  const [unitSettings, setUnitSettings] = useState<UnitSettings>({});
  const [unitSettingsLoaded, setUnitSettingsLoaded] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);

  useEffect(() => {
    if ((profile.role === "officer" || profile.role === "snco") && settingsTab === "templates") {
      getNotificationTemplates().then((res) => {
        if (res.data) setTemplates(res.data as NotifTemplate[]);
      });
    }
    if ((profile.role === "officer" || profile.is_command) && settingsTab === "unit" && !unitSettingsLoaded) {
      getUnitSettings().then((res) => {
        if (res.data) setUnitSettings(res.data as UnitSettings);
        setUnitSettingsLoaded(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTab, profile.role, profile.is_command]);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwPending, startPwTransition] = useTransition();

  const handleProfile = () => {
    const fd = new FormData();
    fd.set("preferred_name", preferredName);
    fd.set("bio", bio);
    fd.set("contact_phone", phone);
    startProfileTransition(async () => {
      const res = await updateProfile(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Profile updated");
    });
  };

  const handlePassword = () => {
    const fd = new FormData();
    fd.set("current_password", currentPw);
    fd.set("new_password", newPw);
    fd.set("confirm_password", confirmPw);
    startPwTransition(async () => {
      const res = await changePassword(fd);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Password changed");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and security preferences.</p>
      </div>

      {isWelcome && (
        <Card className="flex items-start gap-3 border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Welcome aboard!</p>
            <p className="text-sm text-green-700">Your account is set up. Update your preferred name and set a permanent password below.</p>
          </div>
        </Card>
      )}

      {/* Identity card */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#003087]/10 text-lg font-bold text-[#003087]">
            {(profile.preferred_name ?? profile.full_name).slice(0,2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              {profile.rank && <span className="text-sm text-gray-500">{profile.rank}</span>}
              <Badge variant="outline" className="text-xs">{roleLabel(profile.role)}</Badge>
              {profile.billet && <span className="text-xs text-gray-400">{profile.billet}</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {([
              { value: "profile",  label: "Profile",      icon: User },
              { value: "password", label: "Password",     icon: Lock },
              { value: "account",  label: "Account Info", icon: Shield },
              ...((profile.role === "officer" || profile.role === "snco") ? [{ value: "templates", label: "Email Templates", icon: Bell }] : []),
              ...((profile.role === "officer" || profile.is_command) ? [{ value: "unit", label: "Unit Settings", icon: Building2 }] : []),
            ] as { value: string; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSettingsTab(value)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  settingsTab === value
                    ? "border-[#003087] text-[#003087]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile tab */}
        {settingsTab === "profile" && <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Display Preferences</h2>
            <div className="space-y-1">
              <Label htmlFor="preferred_name">Preferred / Nickname</Label>
              <Input
                id="preferred_name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="How you&apos;d like to be called (optional)"
              />
              <p className="text-xs text-gray-400">Displayed alongside your full name in the roster and chain of command.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(optional)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio / Notes</Label>
              <textarea
                id="bio"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Optional short bio"
              />
            </div>
            <Button onClick={handleProfile} disabled={profilePending} className="bg-[#003087] hover:bg-[#002266]">
              {profilePending ? "Saving…" : "Save Profile"}
            </Button>
          </Card>
        </div>}

        {/* Password tab */}
        {settingsTab === "password" && <div>
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Change Password</h2>
            {isWelcome && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You were invited by an officer. Set a permanent password now to secure your account.
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="current_pw">Current Password</Label>
              <Input id="current_pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new_pw">New Password</Label>
              <Input id="new_pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm_pw">Confirm New Password</Label>
              <Input id="confirm_pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </div>
            <Button onClick={handlePassword} disabled={pwPending || !currentPw || !newPw || !confirmPw} className="bg-[#003087] hover:bg-[#002266]">
              {pwPending ? "Changing…" : "Change Password"}
            </Button>
          </Card>
        </div>}

        {/* Account Info tab */}
        {settingsTab === "account" && <div>
          <Card className="divide-y p-0 overflow-hidden">
            {[
              { label: "Full Name", value: profile.full_name },
              { label: "Email", value: profile.email ?? "—" },
              { label: "Role", value: roleLabel(profile.role) },
              { label: "Rank", value: profile.rank ?? "—" },
              { label: "Billet", value: profile.billet ?? "Unassigned" },
              { label: "Division", value: profile.division_id ?? "—" },
              { label: "Join Date", value: profile.join_date ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </Card>
          <p className="mt-2 text-xs text-gray-400">
            Rank, billet, and division are managed by officers. Contact your CO or XO for corrections.
          </p>
        </div>}

        {/* Notification Templates tab — officers + SNCOs */}
        {settingsTab === "templates" && (profile.role === "officer" || profile.role === "snco") && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Notification & Email Templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Customize the messages cadets receive from portal actions. Use <code className="bg-gray-100 px-1 rounded text-xs">{"{variable}"}</code> placeholders.
              </p>
            </div>
            {templates.length === 0 && (
              <Card className="p-6 text-center text-sm text-gray-400">Loading templates…</Card>
            )}
            {templates.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{t.label}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                    {editingTemplate?.id !== t.id && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500"><span className="font-medium">Subject:</span> {t.title_template}</p>
                        <p className="text-xs text-gray-500"><span className="font-medium">Body:</span> {t.body_template}</p>
                      </div>
                    )}
                    {editingTemplate?.id === t.id && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Subject / Title</Label>
                          <Input
                            value={editingTemplate.title_template}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, title_template: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Body</Label>
                          <Textarea
                            rows={4}
                            value={editingTemplate.body_template}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, body_template: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-[#003087] hover:bg-[#002266]"
                            disabled={savingTemplate}
                            onClick={async () => {
                              setSavingTemplate(true);
                              const res = await updateNotificationTemplate(editingTemplate.id, editingTemplate.title_template, editingTemplate.body_template);
                              setSavingTemplate(false);
                              if (res.error) { toast.error(res.error); return; }
                              setTemplates((prev) => prev.map((x) => x.id === editingTemplate.id ? { ...x, ...editingTemplate } : x));
                              setEditingTemplate(null);
                              toast.success("Template saved");
                            }}
                          >
                            {savingTemplate ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {editingTemplate?.id !== t.id && (
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ ...t })}>Edit</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        {/* Unit Settings tab — officers + command */}
        {settingsTab === "unit" && (profile.role === "officer" || profile.is_command) && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Unit Settings</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Displayed throughout the portal. Changes take effect immediately after saving.
              </p>
            </div>
            {!unitSettingsLoaded ? (
              <Card className="p-6 text-center text-sm text-gray-400">Loading…</Card>
            ) : (
              <Card className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Unit Name</Label>
                    <Input
                      value={unitSettings.unit_name ?? ""}
                      onChange={(e) => setUnitSettings((s) => ({ ...s, unit_name: e.target.value }))}
                      placeholder="e.g. SQ-7 NSCC"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Number</Label>
                    <Input
                      value={unitSettings.unit_number ?? ""}
                      onChange={(e) => setUnitSettings((s) => ({ ...s, unit_number: e.target.value }))}
                      placeholder="e.g. 7"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Default Drill Location</Label>
                  <Input
                    value={unitSettings.default_drill_location ?? ""}
                    onChange={(e) => setUnitSettings((s) => ({ ...s, default_drill_location: e.target.value }))}
                    placeholder="e.g. Tabor Academy Field House"
                  />
                  <p className="text-xs text-gray-400">Pre-fills when creating new drill sessions.</p>
                </div>
                <div className="space-y-1">
                  <Label>Unit Motto</Label>
                  <Input
                    value={unitSettings.unit_motto ?? ""}
                    onChange={(e) => setUnitSettings((s) => ({ ...s, unit_motto: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={unitSettings.contact_email ?? ""}
                      onChange={(e) => setUnitSettings((s) => ({ ...s, contact_email: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={unitSettings.contact_phone ?? ""}
                      onChange={(e) => setUnitSettings((s) => ({ ...s, contact_phone: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <Button
                  className="bg-[#003087] hover:bg-[#002266]"
                  disabled={savingUnit}
                  onClick={async () => {
                    setSavingUnit(true);
                    const res = await updateUnitSettings({
                      unit_name: unitSettings.unit_name?.trim() || undefined,
                      unit_number: unitSettings.unit_number?.trim() || undefined,
                      default_drill_location: unitSettings.default_drill_location?.trim() || undefined,
                      unit_motto: unitSettings.unit_motto?.trim() || undefined,
                      contact_email: unitSettings.contact_email?.trim() || undefined,
                      contact_phone: unitSettings.contact_phone?.trim() || undefined,
                    });
                    setSavingUnit(false);
                    if (res?.error) toast.error(res.error);
                    else toast.success("Unit settings saved");
                  }}
                >
                  {savingUnit ? "Saving…" : "Save Unit Settings"}
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
