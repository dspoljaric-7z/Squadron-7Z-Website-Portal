"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, changePassword } from "@/app/(app)/settings/actions";
import { roleLabel } from "@/lib/format";
import type { Profile } from "@/types/database";
import { useSearchParams } from "next/navigation";

export function SettingsClient({ profile }: { profile: Profile }) {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";

  // Profile form
  const [preferredName, setPreferredName] = useState(profile.preferred_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.contact_phone ?? "");
  const [profilePending, startProfileTransition] = useTransition();

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

      <Tabs defaultValue={isWelcome ? "password" : "profile"}>
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-1.5 h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="password"><Lock className="mr-1.5 h-3.5 w-3.5" />Password</TabsTrigger>
          <TabsTrigger value="account"><Shield className="mr-1.5 h-3.5 w-3.5" />Account Info</TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-4 space-y-4">
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
        </TabsContent>

        {/* Password tab */}
        <TabsContent value="password" className="mt-4">
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
        </TabsContent>

        {/* Account Info tab */}
        <TabsContent value="account" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
