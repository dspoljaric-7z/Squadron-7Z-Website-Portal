"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials, roleLabel } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Check, Image as ImageIcon, Copy, CheckCheck, Users, UserCheck, Shield, Search, Pencil, Mail, Send, Zap, Globe, ChevronUp, ChevronDown, X, Download } from "lucide-react";
import { HintButton, type HintSection } from "@/components/shared/hint-button";

const ADMIN_TAB_HINTS: Record<string, { title: string; hints: HintSection[] }> = {
  "members": {
    title: "Members Tab",
    hints: [
      { heading: "Approving registrations", body: "New cadets who register appear with a 'Pending' badge. Click their row to review and Approve or Deny. Approved cadets can fully access the portal." },
      { heading: "Changing roles", body: "Use the role dropdown to promote a cadet to NCO, SNCO, or Officer. Role changes take effect immediately." },
      { heading: "Editing profiles", body: "Click a member's row, then the pencil icon, to update their name, rank, division, billet, or email." },
      { heading: "Deactivating a member", body: "Use 'Deactivate' to revoke portal access without deleting the record. Reactivate at any time." },
    ],
  },
  "invites": {
    title: "Invite Codes Tab",
    hints: [
      { heading: "Creating codes", body: "Click 'New Code' to generate a unique invite link. Share the link with a new member — they register using that code and are automatically approved." },
      { heading: "Single-use vs. multi-use", body: "Codes can be set to expire after one use or after a set date. Use single-use codes for individual invites; multi-use for group registration drives." },
      { heading: "Revoking codes", body: "Delete a code to prevent further registrations with it. Existing accounts created with it are not affected." },
    ],
  },
  "email-invite": {
    title: "Email Invite Tab",
    hints: [
      { heading: "Sending an invite", body: "Enter the recipient's email and an optional personal message. The portal emails them a unique registration link tied to their address." },
      { heading: "Pre-approved access", body: "Email invites bypass the pending-approval step — the cadet is auto-approved on registration. Good for direct officer/staff invites." },
    ],
  },
  "bulk-invite": {
    title: "Bulk Import Tab",
    hints: [
      { heading: "CSV import", body: "Paste or upload a CSV of email addresses (one per line) to send registration invites to an entire class or group at once." },
      { heading: "Format", body: "The CSV should have one email per row, no header required. Invalid emails are skipped and listed in the error summary." },
    ],
  },
  "doc-access": {
    title: "Doc Access Tab",
    hints: [
      { heading: "Document permissions", body: "Control which roles can see uploaded documents. Set access level per document type or per individual file." },
      { heading: "Yeoman access", body: "Yeomen can be granted doc-access permissions here without being promoted to SNCO." },
    ],
  },
  "settings": {
    title: "Site Settings Tab",
    hints: [
      { heading: "Unit name & motto", body: "Update the unit name and motto — these appear in the portal header and on the public-facing pages." },
      { heading: "Auto-approve registrations", body: "Toggle this to auto-approve new registrations without officer review. Use for trusted registration drives; turn it off after." },
      { heading: "CO intent", body: "The CO can enter a standing intent statement that appears on the dashboard for all staff." },
    ],
  },
  "website": {
    title: "Website Tab",
    hints: [
      { heading: "Leadership section", body: "Update the public-facing chain of command shown on the website. Changes take effect immediately on the public site." },
      { heading: "Trainings", body: "List the training programs and activities the unit offers — shown on the public recruitment page." },
      { heading: "Alumni & FAQs", body: "Add notable alumni and FAQ entries for the public website. These are visible to prospective cadets and parents." },
    ],
  },
  "access": {
    title: "Access Tab",
    hints: [
      { heading: "Allowed emails", body: "Add email addresses to the allowlist to permit registration. Only addresses on this list (or holding an invite code) can create an account." },
      { heading: "Removing access", body: "Remove an email to prevent that address from registering. Existing accounts are not affected." },
    ],
  },
  "incidents": {
    title: "Incidents Tab",
    hints: [
      { heading: "Logging an incident", body: "Record serious incidents (safety violations, behavioral issues, chain-of-command escalations) here. Entries are officer-only and timestamped." },
      { heading: "Confidentiality", body: "Incident reports are not visible to NCOs, SNCOs, or cadets — only officers." },
    ],
  },
  "audit-log": {
    title: "Audit Log Tab",
    hints: [
      { heading: "What's tracked", body: "The audit log records all significant actions in the portal — approvals, role changes, record edits, logins, and deletions." },
      { heading: "Filtering", body: "Use the search and date filters to find specific events. Each entry shows who did it, what they did, and when." },
      { heading: "Read-only", body: "The audit log cannot be edited or deleted. It is a tamper-evident record for accountability." },
    ],
  },
  "migrate": {
    title: "Migrate Tab",
    hints: [
      { heading: "Data migration", body: "Use this tab to run database migrations or schema updates when instructed by your portal administrator." },
      { heading: "Caution", body: "Migrations are irreversible. Only run a migration if you understand what it does, or if directed to by the tech lead." },
    ],
  },
};
import { toast } from "sonner";
import type { InviteCode, Profile, SiteSettings, UserRole, DocumentRow } from "@/types/database";
import { sendEmailInvite, sendBulkInvites, activateCadet, updateCadetProfile, deactivateCadet, deleteCadet, bulkDeactivateAll, updateUserEmail, getLastSignInMap } from "@/app/(app)/settings/actions";
import { upsertLeadershipEntry, deleteLeadershipEntry, upsertTrainingEntry, deleteTrainingEntry, upsertAlumniEntry, deleteAlumniEntry, upsertFAQEntry, deleteFAQEntry, setPublicSiteEnabled } from "@/app/(app)/admin/actions";
import type { LeadershipEntry, TrainingEntry, AlumniEntry, FAQEntry } from "@/app/(app)/admin/actions";
import { AccessClient } from "@/components/access/access-client";
import { MigrateClient } from "@/components/migrate/migrate-client";
import { IncidentsClient } from "@/app/(app)/incidents/incidents-client";
import type { IncidentReport } from "@/app/(app)/incidents/actions";
import { AuditLogClient } from "@/components/audit-log/audit-log-client";
import type { AllowedEmail } from "@/types/database";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const ROLES: UserRole[] = ["cadet", "nco", "snco", "officer"];

const OFFICER_BILLETS = [
  { value: "co",           label: "Commanding Officer (CO)" },
  { value: "xo",           label: "Executive Officer (XO)" },
  { value: "admin_o",      label: "Administrative Officer" },
  { value: "ops_o",        label: "Operations Officer" },
  { value: "ass_ops",      label: "Assistant Operations Officer (Ass Ops)" },
  { value: "pao",          label: "Public Affairs Officer (PAO)" },
  { value: "recruiting_o", label: "Recruiting Officer" },
  { value: "supply_o",     label: "Supply Officer" },
];

const CADET_BILLETS = [
  "Command Chief Petty Officer",
  "Lead Petty Officer (LPO)",
  "Assistant Lead Petty Officer (ALPO)",
  "Division Petty Officer (DPO)",
  "Assistant Division Petty Officer (ADPO)",
  "Master-at-Arms (MAA)",
  "Operations Petty Officer",
  "Administrative Petty Officer / Yeoman",
  "Physical Fitness Petty Officer",
  "Supply Petty Officer",
  "Corpsman",
  "Recruiting Petty Officer",
];

type Division = { id: string; name: string };

export function AdminClient({
  profile,
  initialUsers,
  initialInviteCodes,
  initialSettings,
  divisions,
  initialLeadership,
  initialTrainings,
  initialAlumni,
  initialFaqs,
  initialAllowedEmails,
  initialIncidents,
  initialAccessProfiles,
  initialAuditEntries = [],
}: {
  profile: Profile;
  initialUsers: Profile[];
  initialInviteCodes: InviteCode[];
  initialSettings: SiteSettings | null;
  divisions: Division[];
  initialLeadership: LeadershipEntry[];
  initialTrainings: TrainingEntry[];
  initialAlumni: AlumniEntry[];
  initialFaqs: FAQEntry[];
  initialAllowedEmails: AllowedEmail[];
  initialIncidents: IncidentReport[];
  initialAccessProfiles: never[];
  initialAuditEntries?: never[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [codes, setCodes] = useState(initialInviteCodes);
  const [adminTab, setAdminTab] = useState<string>("members");
  const [lastSignInMap, setLastSignInMap] = useState<Record<string, string | null>>({});
  const [leadership, setLeadership] = useState<LeadershipEntry[]>(initialLeadership);
  const [trainings, setTrainings] = useState<TrainingEntry[]>(initialTrainings);
  const [alumni, setAlumni] = useState<AlumniEntry[]>(initialAlumni);
  const [faqs, setFaqs] = useState<FAQEntry[]>(initialFaqs);
  const [settings, setSettings] = useState<SiteSettings>(
    initialSettings ?? { id: 1, unit_name: "", motto: "", logo_url: null, auto_approve_registrations: false, co_intent: null, public_site_enabled: true }
  );

  useEffect(() => {
    getLastSignInMap().then(setLastSignInMap);
  }, []);

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

      <div>
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex">
            {[
              { value: "members",      label: "Members",         icon: Users,  extra: pendingCount > 0 ? <Badge className="ml-1 bg-[#B8860B] text-white">{pendingCount}</Badge> : null },
              { value: "invites",      label: "Invite Codes",    icon: null, extra: null },
              { value: "doc-access",   label: "Doc Access",      icon: null, extra: null },
              { value: "settings",     label: "Site Settings",   icon: null, extra: null },
              { value: "website",      label: "Website",         icon: Globe, extra: null },
              ...(profile.role === "officer" || (profile as unknown as { is_lcpo?: boolean }).is_lcpo ? [
                { value: "access",    label: "Access",    icon: null as typeof Globe | null, extra: null },
                { value: "incidents", label: "Incidents", icon: null as typeof Globe | null, extra: null },
                { value: "audit-log", label: "Audit Log", icon: null as typeof Globe | null, extra: null },
                { value: "migrate",   label: "Migrate",   icon: null as typeof Globe | null, extra: null },
              ] : []),
            ].map(({ value, label, icon: Icon, extra }) => (
              <button
                key={value}
                onClick={() => setAdminTab(value)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  adminTab === value
                    ? "border-[#003087] text-[#003087]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}{label}{extra}
              </button>
            ))}
          </nav>
        </div>

        {ADMIN_TAB_HINTS[adminTab] && (
          <div className="mt-2 flex justify-end">
            <HintButton
              title={ADMIN_TAB_HINTS[adminTab].title}
              hints={ADMIN_TAB_HINTS[adminTab].hints}
            />
          </div>
        )}

        {adminTab === "members" && <div className="mt-4"><MembersTab
            users={users}
            divisions={divisions}
            currentUserId={profile.id}
            currentUserRole={profile.role}
            currentOfficerBillet={(profile as unknown as { officer_billet?: string | null }).officer_billet ?? null}
            isLcpo={(profile as unknown as { is_lcpo?: boolean }).is_lcpo === true}
            isYeoman={(profile as unknown as { is_yeoman?: boolean }).is_yeoman === true}
            lastSignInMap={lastSignInMap}
            onUserUpdate={(id, patch) => setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))}
            onUserDelete={(id) => setUsers((prev) => prev.filter((u) => u.id !== id))}
          /></div>}
        {adminTab === "invites" && <InvitesTab codes={codes} setCodes={setCodes} profile={profile} />}
        {adminTab === "email-invite" && <div className="mt-4"><EmailInviteTab /></div>}
        {adminTab === "bulk-invite" && <div className="mt-4"><BulkInviteTab /></div>}
        {adminTab === "doc-access" && <div className="mt-4"><DocAccessTab /></div>}
        {adminTab === "settings" && <SettingsTab settings={settings} profile={profile} />}
        {adminTab === "website" && (
          <WebsiteTab
            settings={settings}
            onSettingsChange={setSettings}
            leadership={leadership}
            onLeadershipChange={setLeadership}
            trainings={trainings}
            onTrainingsChange={setTrainings}
            alumni={alumni}
            onAlumniChange={setAlumni}
            faqs={faqs}
            onFaqsChange={setFaqs}
          />
        )}
        {adminTab === "access" && (
          <div className="mt-4">
            <AccessClient
              initialAllowed={initialAllowedEmails}
              profiles={initialAccessProfiles as never}
              currentProfile={profile}
            />
          </div>
        )}
        {adminTab === "incidents" && (
          <div className="mt-4">
            <IncidentsClient initialReports={initialIncidents} />
          </div>
        )}
        {adminTab === "audit-log" && (
          <div className="mt-4">
            <AuditLogClient initialEntries={initialAuditEntries} profile={profile} />
          </div>
        )}
        {adminTab === "migrate" && (
          <div className="mt-4">
            <MigrateClient />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Help Tip ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-gray-300 text-[10px] font-bold text-gray-400 hover:border-[#003087] hover:text-[#003087] transition-colors"
      >?</button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-5 top-0 z-20 w-60 rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg">
            {text}
            <button onClick={() => setOpen(false)} className="absolute top-1.5 right-1.5 text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({
  users,
  divisions,
  currentUserId,
  currentUserRole,
  currentOfficerBillet,
  isLcpo = false,
  isYeoman = false,
  lastSignInMap = {},
  onUserUpdate,
  onUserDelete,
}: {
  users: Profile[];
  divisions: Division[];
  currentUserId: string;
  currentUserRole: UserRole;
  currentOfficerBillet: string | null;
  isLcpo?: boolean;
  isYeoman?: boolean;
  lastSignInMap?: Record<string, string | null>;
  onUserUpdate: (id: string, patch: Partial<Profile>) => void;
  onUserDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "deactivated">("all");
  const [divisionFilter, setDivisionFilter] = useState<string | null>("all");
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Record<string, { link?: string; email?: string; tempPassword?: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ rank: string; billet: string; officer_billet: string; division_id: string | null; role: UserRole }>({ rank: "", billet: "", officer_billet: "", division_id: null, role: "cadet" });
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingBillet, setEditingBillet] = useState<string | null>(null);
  const [bulkDeactivating, setBulkDeactivating] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const isOfficer = currentUserRole === "officer" || isLcpo;
  const canDelete = isOfficer || currentUserRole === "snco";
  const canAssignBillets = isLcpo || isYeoman || currentUserRole === "snco" || !currentOfficerBillet || ["co", "xo", "admin_o", "ops_o", "ass_ops"].includes(currentOfficerBillet);
  const rolePillLabel = (r: string) => r === "all" ? "All" : r === "cadet" ? "Cadets" : r === "nco" ? "NCOs" : r === "snco" ? "SNCOs" : "Officers";

  const filtered = useMemo(() => {
    return users
      .filter((u) => !u.email?.endsWith("@sq7z.org"))
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => {
        if (statusFilter === "active") return u.approved && u.active;
        if (statusFilter === "pending") return !u.approved && u.active;
        if (statusFilter === "deactivated") return !u.active;
        return true;
      })
      .filter((u) => {
        if (!divisionFilter || divisionFilter === "all") return true;
        if (divisionFilter === "none") return !(u as unknown as { division_id?: string }).division_id;
        return (u as unknown as { division_id?: string }).division_id === divisionFilter;
      })
      .filter((u) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return u.full_name.toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s);
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [users, roleFilter, statusFilter, divisionFilter, search]);

  const pendingCount = users.filter(u => !u.email?.endsWith("@sq7z.org") && !u.approved && u.active).length;
  const activeCount = users.filter(u => !u.email?.endsWith("@sq7z.org") && u.approved && u.active).length;

  const handleActivate = async (u: Profile) => {
    if (!u.email) { toast.error(`${u.full_name} has no email address — add one first before activating.`); return; }
    setActivating(u.id);
    try {
      const res = await activateCadet(u.id);
      if (res?.error) { toast.error(`Activation failed: ${res.error}`); return; }
      setActivated((prev) => ({ ...prev, [u.id]: { link: res.link, email: res.email, tempPassword: (res as { tempPassword?: string }).tempPassword } }));
      onUserUpdate(u.id, { approved: true, active: true });
      toast.success(`Activation link generated for ${u.full_name}`);
    } catch (err) {
      toast.error(`Activation failed: ${err instanceof Error ? err.message : "Check server configuration."}`);
    } finally {
      setActivating(null);
    }
  };

  const handleDeactivate = async (u: Profile) => {
    if (!confirm(`Deactivate ${u.full_name}? They will lose portal access immediately.`)) return;
    setDeactivating(u.id);
    const res = await deactivateCadet(u.id);
    setDeactivating(null);
    if (res?.error) { toast.error(res.error); return; }
    onUserUpdate(u.id, { active: false, approved: false });
    toast.success(`${u.full_name} deactivated`);
  };

  const startEdit = (u: Profile) => {
    setEditing(u.id);
    setEditDraft({
      rank: u.rank ?? "",
      billet: u.billet ?? "",
      officer_billet: (u as unknown as { officer_billet?: string | null }).officer_billet ?? "",
      division_id: (u as unknown as { division_id?: string }).division_id ?? null,
      role: u.role as UserRole,
    });
  };

  const SNCO_BILLETS_MEMBERS = [
    "Command Chief Petty Officer",
    "Lead Petty Officer (LPO)",
    "Assistant Lead Petty Officer (ALPO)",
    "Operations Petty Officer",
  ];

  const saveEdit = async (u: Profile) => {
    setSaving(true);
    const isOfficerRole = editDraft.role === "officer";
    const billet = isOfficerRole ? undefined : (editDraft.billet || null);
    // Auto-promote to SNCO when a leadership billet is assigned and current role is cadet/nco
    let role = editDraft.role;
    if (billet && SNCO_BILLETS_MEMBERS.includes(billet) && (role === "cadet" || role === "nco")) {
      role = "snco";
    }
    const patch: { rank?: string; billet?: string | null; officer_billet?: string | null; role?: string; division_id?: string | null } = {
      rank: editDraft.rank || undefined,
      billet,
      officer_billet: isOfficerRole ? (editDraft.officer_billet || null) : undefined,
    };
    // Only include role/division_id when the caller can assign billets (officer or LCPO)
    if (canAssignBillets) {
      patch.role = role;
      patch.division_id = editDraft.division_id || null;
    }
    const res = await updateCadetProfile(u.id, patch);
    setSaving(false);
    if (res?.error) { toast.error(res.error); return; }
    onUserUpdate(u.id, { rank: editDraft.rank || undefined, billet: billet ?? null, role: role as UserRole, division_id: editDraft.division_id || null });
    toast.success(role !== editDraft.role ? "Profile updated & role promoted to SNCO" : "Profile updated");
    setEditing(null);
  };

  const saveEmail = async (profileId: string) => {
    setSavingEmail(true);
    const res = await updateUserEmail(profileId, emailDraft);
    setSavingEmail(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success((res as { activated?: boolean }).activated ? "Email set & activation link generated" : "Email updated");
    onUserUpdate(profileId, { email: emailDraft.trim().toLowerCase() });
    setEditingEmail(null);
  };

  const saveName = async (profileId: string) => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setSavingName(true);
    const res = await updateCadetProfile(profileId, { full_name: trimmed });
    setSavingName(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("Name updated");
    onUserUpdate(profileId, { full_name: trimmed });
    setEditingName(null);
  };

  const handleDelete = async (u: Profile) => {
    const res = await deleteCadet(u.id);
    if (res?.error) { toast.error(res.error); return; }
    onUserDelete(u.id);
    toast.success("Account permanently deleted");
  };

  const updateBillet = async (id: string, billet: string | null) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ officer_billet: billet }).eq("id", id);
    if (error) { toast.error("Failed to update billet"); return; }
    toast.success(billet ? `Billet set to ${OFFICER_BILLETS.find((b) => b.value === billet)?.label ?? billet}` : "Billet cleared");
    onUserUpdate(id, { officer_billet: billet } as Partial<Profile>);
    setEditingBillet(null);
  };

  const toggleFlag = async (id: string, field: "is_command" | "is_maa" | "is_yeoman", current: boolean) => {
    const supabase = createClient();
    const patch: Partial<Profile> = { [field]: !current };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    const labelMap = { is_command: "Command", is_maa: "MAA", is_yeoman: "Yeoman" };
    toast.success(`${labelMap[field]} access ${!current ? "granted" : "removed"}`);
    onUserUpdate(id, patch);
  };

  const updateRole = async (id: string, role: UserRole) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) { toast.error("Failed to update role"); return; }
    toast.success("Role updated");
    onUserUpdate(id, { role });
  };

  const handleBulkDeactivate = async () => {
    if (!confirm("Deactivate ALL non-officer accounts? This resets portal access for everyone — you'll re-activate each person individually.")) return;
    setBulkDeactivating(true);
    const res = await bulkDeactivateAll();
    setBulkDeactivating(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("All non-officer accounts deactivated");
  };

  const quickSetDivision = async (userId: string, divisionId: string | null) => {
    const res = await updateCadetProfile(userId, { division_id: divisionId });
    if (res?.error) { toast.error(res.error); return; }
    onUserUpdate(userId, { division_id: divisionId } as Partial<Profile>);
    toast.success(divisionId ? "Division updated" : "Division cleared");
  };

  const exportCSV = () => {
    const rows = filtered.map((u) => {
      const divName = divisions.find((d) => d.id === (u as unknown as { division_id?: string }).division_id)?.name ?? "";
      const billetStr = u.role === "officer"
        ? (OFFICER_BILLETS.find((b) => b.value === (u as unknown as { officer_billet?: string | null }).officer_billet)?.label ?? "")
        : (u.billet ?? "");
      const lastSeen = lastSignInMap[u.id ?? ""] ? new Date(lastSignInMap[u.id ?? ""]!).toLocaleDateString() : "";
      const status = !u.active ? "Deactivated" : u.approved ? "Active" : "Pending";
      return [u.full_name, u.rank ?? "", divName, billetStr, u.role, u.email ?? "", status, lastSeen];
    });
    const header = ["Name", "Rank", "Division", "Billet", "Role", "Email", "Status", "Last Active"];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sq7z-members.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleInviteOfficer = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    setInviting(true);
    const fd = new FormData();
    fd.set("email", inviteEmail.trim());
    fd.set("role", "officer");
    fd.set("full_name", inviteName.trim() || inviteEmail.split("@")[0]);
    const res = await sendEmailInvite(fd);
    setInviting(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(`Invite sent to ${inviteEmail}. They'll receive an email to set their password.`);
    setInviteEmail(""); setInviteName(""); setShowInvite(false);
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-4">
      {/* Help banner */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs text-blue-700 leading-relaxed">
        <span className="shrink-0 font-bold">How it works:</span>
        <span>Find any member, click their email to change it, click <strong>Edit</strong> to update rank/division/billet. Click <strong>Activate</strong> to generate a one-time login link — copy and send it via email, text, or Discord. For new officers, use <strong>Invite New Officer</strong> to send them an automatic email invite.</span>
      </div>

      {/* Invite officer (officers only) */}
      {isOfficer && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#003087]" />
              Invite New Officer
            </span>
            {showInvite ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {showInvite && (
            <div className="border-t px-4 py-3 space-y-2">
              <p className="text-xs text-gray-400">They&apos;ll receive an email with a link to set their password. Assign their billet once they appear in the list below.</p>
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-44" />
                <Input placeholder="Email address" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-56" />
                <Button className="bg-[#003087] hover:bg-[#002266] text-white" onClick={handleInviteOfficer} disabled={inviting || !inviteEmail.trim()}>
                  <Send className="mr-1 h-4 w-4" />{inviting ? "Sending…" : "Send Invite"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex rounded-md border bg-white p-0.5 text-xs">
          {(["all", "cadet", "nco", "snco", "officer"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`rounded-sm px-2.5 py-1 transition-colors ${roleFilter === r ? "bg-[#003087] text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {rolePillLabel(r)}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border bg-white p-0.5 text-xs">
          {(["all", "active", "pending", "deactivated"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-sm px-2.5 py-1 capitalize transition-colors ${statusFilter === s ? "bg-[#003087] text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {s}
            </button>
          ))}
        </div>
        {divisions.length > 0 && (
          <Select value={divisionFilter ?? "all"} onValueChange={(v) => setDivisionFilter(v ?? "all")}>
            <SelectTrigger className="h-8 text-xs w-36 border">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              <SelectItem value="none">No Division</SelectItem>
              {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs whitespace-nowrap">
          <Download className="mr-1 h-3 w-3" />Export CSV
        </Button>
        {isOfficer && (
          <Button size="sm" variant="outline" onClick={handleBulkDeactivate} disabled={bulkDeactivating}
            className="text-red-600 border-red-200 hover:bg-red-50 text-xs whitespace-nowrap">
            {bulkDeactivating ? "Working…" : "Deactivate All"}
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-400">{activeCount} active · {pendingCount} pending · {filtered.length} shown</p>

      {/* Member list */}
      <Card className="divide-y">
        {filtered.map((u) => {
          const isEditing = editing === u.id;
          const isActivating = activating === u.id;
          const isDeactivating = deactivating === u.id;
          const result = activated[u.id];
          const userDivisionId = (u as unknown as { division_id?: string }).division_id;
          const divisionName = divisions.find((d) => d.id === userDivisionId)?.name;
          const billetLabel = OFFICER_BILLETS.find((b) => b.value === (u as unknown as { officer_billet?: string | null }).officer_billet)?.label;
          const isEditingThisBillet = editingBillet === u.id;
          const isEditingThisEmail = editingEmail === u.id;
          const isPending = !u.approved && u.active;
          const isActive = u.approved && u.active;
          const isDeactivated = !u.active;
          const effectiveBillet = u.role === "officer" ? billetLabel : u.billet;
          const missingFields = isActive ? [
            ...(!u.rank ? ["rank"] : []),
            ...(!userDivisionId ? ["division"] : []),
            ...(!effectiveBillet ? ["billet"] : []),
          ] : [];
          const isIncomplete = missingFields.length > 0;
          const noEmail = !u.email;
          const lastSeen = lastSignInMap[u.id ?? ""];
          const lastSeenStr = lastSeen ? `Last active ${format(new Date(lastSeen), "MMM d")}` : null;

          return (
            <div key={u.id} className="p-3 space-y-2">
              {/* Main row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={`text-xs text-white ${u.role === "officer" ? "bg-[#B8860B]" : "bg-[#003087]"}`}>{initials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingName === u.id ? (
                        <div className="flex items-center gap-1">
                          <Input autoFocus className="h-6 text-xs w-44 font-semibold" value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveName(u.id); if (e.key === "Escape") setEditingName(null); }}
                          />
                          <Button size="sm" className="h-6 px-2 text-xs bg-[#003087] hover:bg-[#002266] text-white" onClick={() => saveName(u.id)} disabled={savingName}>
                            {savingName ? "…" : "Save"}
                          </Button>
                          <button onClick={() => setEditingName(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingName(u.id); setNameDraft(u.full_name); }}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-[#003087] transition-colors group">
                          {u.full_name}
                          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                      )}
                      {noEmail && (
                        <span className="text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          No email — can&apos;t activate
                        </span>
                      )}
                      {isIncomplete && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Missing: {missingFields.join(", ")}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 capitalize">{roleLabel(u.role)}</span>
                      {result && <Badge className="bg-green-600 text-white text-xs">Link Ready</Badge>}
                      {!result && isActive && <Badge className="bg-green-600 text-white text-xs">Active</Badge>}
                      {isPending && <Badge className="bg-[#B8860B] text-white text-xs">Pending</Badge>}
                      {isDeactivated && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                      {lastSeenStr && <span className="text-[10px] text-gray-300">{lastSeenStr}</span>}
                    </div>
                    {/* Email — click to edit */}
                    {isEditingThisEmail ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input autoFocus type="email" autoComplete="off" className="h-6 text-xs w-48" value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmail(u.id); if (e.key === "Escape") setEditingEmail(null); }}
                        />
                        <Button size="sm" className="h-6 px-2 text-xs bg-[#003087] hover:bg-[#002266] text-white" onClick={() => saveEmail(u.id)} disabled={savingEmail}>
                          {savingEmail ? "…" : "Save"}
                        </Button>
                        <button onClick={() => setEditingEmail(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingEmail(u.id); setEmailDraft(u.email ?? ""); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#003087] transition-colors mt-0.5">
                        <Pencil className="h-2.5 w-2.5" />{u.email}
                      </button>
                    )}
                    {!isEditing && (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {u.rank && <span className="text-xs text-gray-500">{u.rank}</span>}
                        {u.rank && <span className="text-xs text-gray-300">·</span>}
                        {isOfficer && divisions.length > 0 ? (
                          <Select value={userDivisionId ?? "__none__"} onValueChange={(v) => quickSetDivision(u.id, v === "__none__" ? null : v)}>
                            <SelectTrigger className="h-5 text-[11px] border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto gap-0.5 text-gray-500 hover:text-[#003087]">
                              <SelectValue placeholder="+ Division" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No division —</SelectItem>
                              {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          divisionName && <span className="text-xs text-gray-500">{divisionName}</span>
                        )}
                        {(billetLabel ?? u.billet) && <><span className="text-xs text-gray-300">·</span><span className="text-xs text-gray-500">{billetLabel ?? u.billet}</span></>}
                        {!u.rank && !userDivisionId && !(billetLabel ?? u.billet) && <span className="text-xs italic text-gray-300">No details yet</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role selector — officers only, not self */}
                  {isOfficer && u.id !== currentUserId && (
                    <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue>{roleLabel(u.role)}</SelectValue></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <Button size="sm" variant="outline" onClick={() => isEditing ? setEditing(null) : startEdit(u)}>
                    <Pencil className="mr-1 h-3 w-3" />{isEditing ? "Cancel" : "Edit"}
                  </Button>
                  {/* Activate / Re-send / Reactivate */}
                  {isDeactivated ? (
                    <Button size="sm" onClick={() => handleActivate(u)} disabled={isActivating} className="bg-[#003087] hover:bg-[#002266] text-white">
                      <Zap className="mr-1 h-3 w-3" />{isActivating ? "…" : "Reactivate"}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleActivate(u)} disabled={isActivating}
                      className={isActive && !result ? "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200" : "bg-[#003087] hover:bg-[#002266] text-white"}>
                      <Zap className="mr-1 h-3 w-3" />
                      {isActivating ? "…" : isPending ? "Activate" : result ? "Re-send" : "Re-send Link"}
                    </Button>
                  )}
                  {isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(u)} disabled={isDeactivating || u.id === currentUserId}
                      className="text-red-600 border-red-200 hover:bg-red-50">
                      {isDeactivating ? "…" : "Deactivate"}
                    </Button>
                  )}
                  {canDelete && u.id !== currentUserId && (isDeactivated || isPending) && (
                    <AlertDialog>
                      <AlertDialogTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {u.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes their account and all associated records — attendance, qualifications, corrections, and notifications. This cannot be undone. Use Deactivate to only revoke access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(u)}>Delete permanently</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Division">
                          {editDraft.division_id ? (divisions.find((d) => d.id === editDraft.division_id)?.name ?? null) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-400">Billet / Title</Label>
                    {editDraft.role === "officer" ? (
                      <Select value={editDraft.officer_billet || "__none__"} onValueChange={(v) => setEditDraft((p) => ({ ...p, officer_billet: v === "__none__" ? "" : (v ?? "") }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select officer billet…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {OFFICER_BILLETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={editDraft.billet || "__none__"} onValueChange={(v) => setEditDraft((p) => ({ ...p, billet: v === "__none__" ? "" : (v ?? "") }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select billet…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {CADET_BILLETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
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

              {/* Access flags + billet (officer viewers only) */}
              {isOfficer && (
                <div className="pl-12 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Access:</span>
                  {(["is_command", "is_maa", "is_yeoman"] as const).map((flag) => {
                    const on = u[flag];
                    const labelMap = { is_command: "Command", is_maa: "MAA", is_yeoman: "Yeoman" };
                    const hintMap = { is_command: "Corrections · PIPs · Issues", is_maa: "Uniform Inspections", is_yeoman: "Admin documents · Muster access" };
                    return (
                      <button key={flag} title={hintMap[flag]} onClick={() => toggleFlag(u.id, flag, on)}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${on ? "border-[#003087] bg-[#003087] text-white" : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:text-gray-600"}`}>
                        {on && <Check className="h-2.5 w-2.5" />}{labelMap[flag]}
                      </button>
                    );
                  })}
                  {u.role === "officer" && canAssignBillets && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Billet:</span>
                      {isEditingThisBillet ? (
                        <>
                          <Select
                            value={(u as unknown as { officer_billet?: string | null }).officer_billet ?? ""}
                            onValueChange={(v) => updateBillet(u.id, v || null)}
                          >
                            <SelectTrigger className="h-6 text-[11px] border-gray-200 bg-gray-50 rounded-full px-2.5 w-auto min-w-40">
                              <SelectValue placeholder="No billet (full access)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No billet (full access)</SelectItem>
                              {OFFICER_BILLETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button onClick={() => setEditingBillet(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <button onClick={() => setEditingBillet(u.id)}
                          className="text-xs text-gray-400 hover:text-[#003087] flex items-center gap-1 transition-colors">
                          <Pencil className="h-3 w-3" />
                          {billetLabel ? billetLabel : "Assign billet"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Activation result */}
              {(result?.link || result?.tempPassword) && (
                <div className="pl-12 rounded-md border border-green-200 bg-green-50 p-2 text-xs space-y-2">
                  {result.tempPassword && (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-green-800">Tell {result.email} to log in with:</p>
                      <p className="text-green-700">Email: <span className="font-mono">{result.email}</span></p>
                      <p className="text-green-700">Password: <span className="font-mono font-bold">{result.tempPassword}</span></p>
                      <p className="text-green-600 text-[10px]">They can change their password after logging in.</p>
                    </div>
                  )}
                  {result.link && (
                    <div className="space-y-0.5">
                      <p className="text-green-700 text-[10px]">Or send this one-click link (expires, use only once):</p>
                      <p className="text-green-700 break-all font-mono text-[10px]">{result.link}</p>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => copyLink(result.link!)}>
                        <Copy className="mr-1 h-3 w-3" />Copy Link
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No members match that filter.</p>}
      </Card>
    </div>
  );
}

// ─── Activate Cadets Tab ─────────────────────────────────────────────────────

// Low → high: NLCC entry, old NLCC, old LC ranks, NSCC entry, PO, top, officers
const RANKS = ["RC", "APC", "ABC", "AA", "AR", "AN", "LC6", "LC5", "LC4", "LC3", "LC2", "LC1", "SR", "SA", "SN", "PO3", "PO2", "PO1", "SLPO", "CPO", "MIDN", "ENS", "LTJG", "LT", "LCDR", "INST"];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActivateTab({ users, divisions }: { users: Profile[]; divisions: Division[] }) {
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Record<string, { link?: string; email?: string; tempPassword?: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ rank: string; billet: string; division_id: string | null; role: UserRole }>({ rank: "", billet: "", division_id: null, role: "cadet" });
  const [saving, setSaving] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [bulkDeactivating, setBulkDeactivating] = useState(false);

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

  const SNCO_BILLETS = [
    "Command Chief Petty Officer",
    "Lead Petty Officer (LPO)",
    "Assistant Lead Petty Officer (ALPO)",
    "Operations Petty Officer",
  ];

  const saveEdit = async (u: Profile) => {
    setSaving(true);
    const billet = editDraft.billet || null;
    // Auto-promote to SNCO when a leadership billet is assigned and current role is cadet/nco
    let role = editDraft.role;
    if (billet && SNCO_BILLETS.includes(billet) && (role === "cadet" || role === "nco")) {
      role = "snco";
    }
    const res = await updateCadetProfile(u.id, {
      rank: editDraft.rank || undefined,
      billet,
      role,
      division_id: editDraft.division_id || null,
    });
    setSaving(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(role !== editDraft.role ? `Profile updated & role promoted to SNCO` : "Profile updated");
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
    if (!u.email) { toast.error(`${u.full_name} has no email address — add one first before activating.`); return; }
    setActivating(u.id);
    try {
      const res = await activateCadet(u.id);
      if (res?.error) { toast.error(`Activation failed: ${res.error}`); return; }
      setActivated((prev) => ({ ...prev, [u.id]: { link: res.link, email: res.email, tempPassword: (res as { tempPassword?: string }).tempPassword } }));
      toast.success(`Activation link generated for ${u.full_name}`);
    } catch (err) {
      toast.error(`Activation failed: ${err instanceof Error ? err.message : "Check server configuration."}`);
    } finally {
      setActivating(null);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const handleBulkDeactivate = async () => {
    if (!confirm("Deactivate ALL non-officer accounts? This will reset their portal access. You'll need to re-activate each one individually.")) return;
    setBulkDeactivating(true);
    const res = await bulkDeactivateAll();
    setBulkDeactivating(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("All non-officer accounts deactivated");
  };

  const saveEmail = async (profileId: string) => {
    setSavingEmail(true);
    const res = await updateUserEmail(profileId, emailDraft);
    setSavingEmail(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success((res as { activated?: boolean }).activated ? "Email set & activation link generated" : "Email updated");
    setEditingEmail(null);
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
        <Button size="sm" variant="outline" onClick={handleBulkDeactivate} disabled={bulkDeactivating} className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap">
          {bulkDeactivating ? "…" : "Deactivate All"}
        </Button>
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
                    {editingName === u.id ? (
                      <div className="flex items-center gap-1 mb-0.5">
                        <Input autoFocus className="h-6 text-xs w-44 font-semibold" value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { const n = nameDraft.trim(); if (n) { setSavingName(true); updateCadetProfile(u.id, { full_name: n }).then((r) => { setSavingName(false); if (r?.error) { toast.error(r.error); } else { toast.success("Name updated"); setEditingName(null); } }); } } if (e.key === "Escape") setEditingName(null); }}
                        />
                        <Button size="sm" className="h-6 px-2 text-xs bg-[#003087] hover:bg-[#002266] text-white" disabled={savingName}
                          onClick={() => { const n = nameDraft.trim(); if (!n) return; setSavingName(true); updateCadetProfile(u.id, { full_name: n }).then((r) => { setSavingName(false); if (r?.error) { toast.error(r.error); } else { toast.success("Name updated"); setEditingName(null); } }); }}>
                          {savingName ? "…" : "Save"}
                        </Button>
                        <button onClick={() => setEditingName(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingName(u.id); setNameDraft(u.full_name); }}
                        className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-[#003087] transition-colors group mb-0.5">
                        {u.full_name}
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                    {editingEmail === u.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          autoFocus
                          type="email"
                          autoComplete="off"
                          className="h-6 text-xs w-48"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmail(u.id); if (e.key === "Escape") setEditingEmail(null); }}
                        />
                        <Button size="sm" className="h-6 px-2 text-xs bg-[#003087] hover:bg-[#002266] text-white" onClick={() => saveEmail(u.id)} disabled={savingEmail}>
                          {savingEmail ? "…" : "Save"}
                        </Button>
                        <button onClick={() => setEditingEmail(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingEmail(u.id); setEmailDraft(u.email ?? ""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#003087] transition-colors">
                        <Pencil className="h-2.5 w-2.5" />{u.email}
                      </button>
                    )}
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
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Division">
                          {editDraft.division_id
                            ? (divisions.find((d) => d.id === editDraft.division_id)?.name ?? null)
                            : null}
                        </SelectValue>
                      </SelectTrigger>
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
              {(result?.link || result?.tempPassword) && (
                <div className="pl-12 rounded-md border border-green-200 bg-green-50 p-2 text-xs space-y-2">
                  {result.tempPassword && (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-green-800">Tell {result.email} to log in with:</p>
                      <p className="text-green-700">Email: <span className="font-mono">{result.email}</span></p>
                      <p className="text-green-700">Password: <span className="font-mono font-bold">{result.tempPassword}</span></p>
                      <p className="text-green-600 text-[10px]">They can change their password after logging in.</p>
                    </div>
                  )}
                  {result.link && (
                    <div className="space-y-0.5">
                      <p className="text-green-700 text-[10px]">Or send this one-click link (expires, use only once):</p>
                      <p className="text-green-700 break-all font-mono text-[10px]">{result.link}</p>
                      <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => copyLink(result.link!)}>
                        <Copy className="mr-1 h-3 w-3" />Copy Link
                      </Button>
                    </div>
                  )}
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UsersTab({
  users, currentUserId, currentUserRole, currentOfficerBillet, onUserUpdate, onUserDelete,
}: {
  users: Profile[];
  currentUserId: string;
  currentUserRole: UserRole;
  currentOfficerBillet: string | null;
  onUserUpdate: (id: string, patch: Partial<Profile>) => void;
  onUserDelete: (id: string) => void;
}) {
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
    else { toast.success("Role updated"); onUserUpdate(id, { role }); }
  };

  const approve = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) toast.error("Failed to approve");
    else { toast.success("User approved"); onUserUpdate(id, { approved: true }); }
  };

  const approveAll = async () => {
    const supabase = createClient();
    const ids = pending.map((u) => u.id);
    const { error } = await supabase.from("profiles").update({ approved: true }).in("id", ids);
    if (error) toast.error("Failed to approve all");
    else {
      toast.success(`Approved ${ids.length} user${ids.length !== 1 ? "s" : ""}`);
      ids.forEach((id) => onUserUpdate(id, { approved: true }));
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ active: !active }).eq("id", id);
    if (error) toast.error("Failed to update");
    else onUserUpdate(id, { active: !active });
  };

  const toggleFlag = async (id: string, field: "is_command" | "is_maa", current: boolean) => {
    const supabase = createClient();
    const patch = field === "is_command" ? { is_command: !current } : { is_maa: !current };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      toast.success(`${field === "is_command" ? "Command" : "MAA"} access ${!current ? "granted" : "removed"}`);
      onUserUpdate(id, patch);
    }
  };

  const updateBillet = async (id: string, billet: string | null) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ officer_billet: billet }).eq("id", id);
    if (error) toast.error("Failed to update billet");
    else {
      toast.success(billet ? `Billet set to ${OFFICER_BILLETS.find((b) => b.value === billet)?.label ?? billet}` : "Billet cleared");
      onUserUpdate(id, { officer_billet: billet } as Partial<Profile>);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteCadet(id);
    if (res?.error) { toast.error(res.error); return; }
    onUserDelete(id);
    toast.success("Account permanently deleted");
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
                {(currentUserRole === "officer" || currentUserRole === "snco") && u.id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {u.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes their account and all associated records — attendance, qualifications, corrections, and notifications. This cannot be undone. If you only want to revoke access, use Deactivate instead.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(u.id)}
                        >
                          Delete permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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
                {u.role === "officer" && (!currentOfficerBillet || ["co","xo","admin_o","ops_o","ass_ops"].includes(currentOfficerBillet)) && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Billet:</span>
                    <Select
                      value={(u as unknown as { officer_billet?: string | null }).officer_billet ?? "none"}
                      onValueChange={(v) => updateBillet(u.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-6 text-[11px] border-gray-200 bg-gray-50 rounded-full px-2.5 w-auto min-w-28">
                        <SelectValue placeholder="No billet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No billet (full access)</SelectItem>
                        {OFFICER_BILLETS.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-4 text-sm text-gray-400">No users match that search.</p>}
      </Card>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OfficersTab({
  users,
  currentOfficerBillet,
  onUserUpdate,
}: {
  users: Profile[];
  currentOfficerBillet: string | null;
  onUserUpdate: (id: string, patch: Partial<Profile>) => void;
}) {
  const [activating, setActivating] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Record<string, { link?: string; email?: string; tempPassword?: string }>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [editingBillet, setEditingBillet] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const saveEmail = async (profileId: string) => {
    setSavingEmail(true);
    const res = await updateUserEmail(profileId, emailDraft);
    setSavingEmail(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("Email updated");
    onUserUpdate(profileId, { email: emailDraft.trim().toLowerCase() });
    setEditingEmail(null);
  };

  const canAssignBillets = !currentOfficerBillet || ["co", "xo", "admin_o", "ops_o", "ass_ops"].includes(currentOfficerBillet);

  const officers = useMemo(() =>
    users
      .filter((u) => u.role === "officer")
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [users]
  );

  const handleActivate = async (u: Profile) => {
    if (!u.email) { toast.error(`${u.full_name} has no email address — add one first before activating.`); return; }
    setActivating(u.id);
    try {
      const res = await activateCadet(u.id);
      if (res?.error) { toast.error(`Activation failed: ${res.error}`); return; }
      setActivated((prev) => ({ ...prev, [u.id]: { link: res.link, email: res.email, tempPassword: (res as { tempPassword?: string }).tempPassword } }));
      toast.success(`Activation link generated for ${u.full_name}`);
    } catch (err) {
      toast.error(`Activation failed: ${err instanceof Error ? err.message : "Check server configuration."}`);
    } finally {
      setActivating(null);
    }
  };

  const handleDeactivate = async (u: Profile) => {
    if (!confirm(`Deactivate ${u.full_name}? They will lose portal access immediately.`)) return;
    setDeactivating(u.id);
    const res = await deactivateCadet(u.id);
    setDeactivating(null);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(`${u.full_name} deactivated`);
    onUserUpdate(u.id, { active: false, approved: false });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    setInviting(true);
    const fd = new FormData();
    fd.set("email", inviteEmail.trim());
    fd.set("role", "officer");
    fd.set("full_name", inviteName.trim() || inviteEmail.split("@")[0]);
    const res = await sendEmailInvite(fd);
    setInviting(false);
    if (res?.error) { toast.error(res.error); return; }
    toast.success(`Invite sent to ${inviteEmail}. Set their billet once they appear in this list.`);
    setInviteEmail("");
    setInviteName("");
  };

  const updateBillet = async (id: string, billet: string | null) => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ officer_billet: billet }).eq("id", id);
    if (error) { toast.error("Failed to update billet"); return; }
    toast.success(billet ? `Billet set to ${OFFICER_BILLETS.find((b) => b.value === billet)?.label ?? billet}` : "Billet cleared");
    onUserUpdate(id, { officer_billet: billet } as Partial<Profile>);
    setEditingBillet(null);
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-4">
      {/* Invite new officer */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Invite New Officer</p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Name (optional)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="w-44"
          />
          <Input
            placeholder="Email address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-56"
          />
          <Button
            className="bg-[#003087] hover:bg-[#002266] text-white"
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
          >
            <Mail className="mr-1 h-4 w-4" />
            {inviting ? "Sending…" : "Send Invite"}
          </Button>
        </div>
        <p className="text-xs text-gray-400">They&apos;ll receive an email to set their password. Assign their billet below once they appear in the list.</p>
      </Card>

      {/* Officer list */}
      <Card className="divide-y">
        {officers.length === 0 && (
          <p className="p-4 text-sm text-gray-400">No officer accounts yet. Invite one above.</p>
        )}
        {officers.map((u) => {
          const isActivating = activating === u.id;
          const isDeactivating = deactivating === u.id;
          const result = activated[u.id];
          const billetLabel = OFFICER_BILLETS.find((b) => b.value === (u as unknown as { officer_billet?: string | null }).officer_billet)?.label;
          const isEditingBillet = editingBillet === u.id;

          return (
            <div key={u.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-[#B8860B] text-xs text-white">{initials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                    {editingEmail === u.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          autoFocus
                          type="email"
                          autoComplete="off"
                          className="h-6 text-xs w-48"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmail(u.id); if (e.key === "Escape") setEditingEmail(null); }}
                        />
                        <Button size="sm" className="h-6 px-2 text-xs bg-[#003087] hover:bg-[#002266] text-white" onClick={() => saveEmail(u.id)} disabled={savingEmail}>
                          {savingEmail ? "…" : "Save"}
                        </Button>
                        <button onClick={() => setEditingEmail(null)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingEmail(u.id); setEmailDraft(u.email ?? ""); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#003087] transition-colors">
                        <Pencil className="h-2.5 w-2.5" />{u.email}
                      </button>
                    )}
                    {billetLabel && !isEditingBillet && (
                      <p className="text-xs text-[#B8860B] font-medium mt-0.5">{billetLabel}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {u.approved && u.active && !result && <Badge className="bg-green-600 text-white text-xs">Active</Badge>}
                  {!u.active && <Badge variant="destructive" className="text-xs">Deactivated</Badge>}
                  {u.active && (
                    <Button
                      size="sm"
                      onClick={() => handleActivate(u)}
                      disabled={isActivating}
                      className={u.approved && !result ? "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200" : "bg-[#003087] hover:bg-[#002266] text-white"}
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      {isActivating ? "Generating…" : u.approved && !result ? "Re-send Link" : "Activate"}
                    </Button>
                  )}
                  {!u.active && (
                    <Button size="sm" onClick={() => handleActivate(u)} disabled={isActivating} className="bg-[#003087] hover:bg-[#002266] text-white">
                      <Zap className="mr-1 h-3 w-3" />
                      {isActivating ? "Generating…" : "Reactivate"}
                    </Button>
                  )}
                  {u.active && u.approved && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(u)} disabled={isDeactivating} className="text-red-600 border-red-200 hover:bg-red-50">
                      {isDeactivating ? "…" : "Deactivate"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Billet editor */}
              {canAssignBillets && (
                <div className="pl-12 flex items-center gap-2">
                  {isEditingBillet ? (
                    <>
                      <Select
                        value={(u as unknown as { officer_billet?: string | null }).officer_billet ?? ""}
                        onValueChange={(v) => updateBillet(u.id, v || null)}
                      >
                        <SelectTrigger className="h-7 w-56 text-xs">
                          <SelectValue placeholder="No billet (full access)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No billet (full access)</SelectItem>
                          {OFFICER_BILLETS.map((b) => (
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={() => setEditingBillet(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingBillet(u.id)}
                      className="text-xs text-gray-400 hover:text-[#003087] flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      {billetLabel ? "Change billet" : "Assign billet"}
                    </button>
                  )}
                </div>
              )}

              {/* Activation result */}
              {(result?.link || result?.tempPassword) && (
                <div className="pl-12 rounded-md border border-green-200 bg-green-50 p-2 text-xs space-y-2">
                  {result.tempPassword && (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-green-800">Tell them to log in with:</p>
                      <p className="text-green-700">Email: <span className="font-mono">{result.email}</span></p>
                      <p className="text-green-700">Password: <span className="font-mono font-bold">{result.tempPassword}</span></p>
                    </div>
                  )}
                  {result.link && (
                    <div className="flex items-center gap-2">
                      <Input value={result.link} readOnly className="h-7 text-xs font-mono" />
                      <Button size="sm" variant="outline" onClick={() => copyLink(result.link!)} className="shrink-0">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function InvitesTab({ codes, setCodes, profile }: { codes: InviteCode[]; setCodes: React.Dispatch<React.SetStateAction<InviteCode[]>>; profile: Profile }) {
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
    setCodes((prev) => [{ id: crypto.randomUUID(), code, role_grant: role, created_by: profile.id, used: false, expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), created_at: new Date().toISOString() } as InviteCode, ...prev]);
    await navigator.clipboard.writeText(code).catch(() => {});
    toast.success(`Code created & copied: ${code}`);
  };

  const revoke = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("invite_codes").update({ used: true }).eq("id", id);
    if (error) { toast.error("Failed to revoke"); return; }
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, used: true } : c));
    toast.success("Code revoked");
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setCodes((prev) => prev.filter((c) => c.id !== id));
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
  const [coIntent, setCoIntent] = useState(settings.co_intent ?? "");
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("site_settings").update({
      unit_name: unitName, motto, logo_url: logoUrl || null, auto_approve_registrations: autoApprove,
      co_intent: coIntent || null,
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">CO&apos;s Intent</Label>
            <textarea
              value={coIntent}
              onChange={(e) => setCoIntent(e.target.value)}
              placeholder="The Commanding Officer's statement of intent — displayed on the public leadership page."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            <p className="text-xs text-gray-400">Shown as a blockquote on the public Leadership page.</p>
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

// ─── Website Tab ──────────────────────────────────────────────────────────────

const EMPTY_ENTRY: Omit<LeadershipEntry, "id"> = {
  title: "",
  name: "",
  initials: "",
  description: "",
  sort_order: 99,
};

function WebsiteTab({
  settings,
  onSettingsChange,
  leadership,
  onLeadershipChange,
  trainings,
  onTrainingsChange,
  alumni,
  onAlumniChange,
  faqs,
  onFaqsChange,
}: {
  settings: SiteSettings;
  onSettingsChange: (s: SiteSettings) => void;
  leadership: LeadershipEntry[];
  onLeadershipChange: (entries: LeadershipEntry[]) => void;
  trainings: TrainingEntry[];
  onTrainingsChange: (entries: TrainingEntry[]) => void;
  alumni: AlumniEntry[];
  onAlumniChange: (entries: AlumniEntry[]) => void;
  faqs: FAQEntry[];
  onFaqsChange: (entries: FAQEntry[]) => void;
}) {
  const [togglingPublic, setTogglingPublic] = useState(false);
  const router = useRouter();

  async function togglePublicSite() {
    setTogglingPublic(true);
    const next = !settings.public_site_enabled;
    const result = await setPublicSiteEnabled(next);
    if ("error" in result) { toast.error(result.error); setTogglingPublic(false); return; }
    onSettingsChange({ ...settings, public_site_enabled: next });
    toast.success(next ? "Public website is now LIVE." : "Public website is now OFFLINE.");
    setTogglingPublic(false);
    router.refresh();
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<Omit<LeadershipEntry, "id"> & { id?: string }>(EMPTY_ENTRY);
  const [saving, setSaving] = useState(false);

  function startEdit(entry: LeadershipEntry) {
    setDraft(entry);
    setEditingId(entry.id);
    setAddingNew(false);
  }

  function startAdd() {
    setDraft({ ...EMPTY_ENTRY, sort_order: (leadership.at(-1)?.sort_order ?? 0) + 1 });
    setAddingNew(true);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setDraft(EMPTY_ENTRY);
  }

  async function save() {
    if (!draft.title || !draft.name || !draft.initials) {
      toast.error("Title, name, and initials are required.");
      return;
    }
    setSaving(true);
    const res = await upsertLeadershipEntry(draft);
    setSaving(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(addingNew ? "Entry added." : "Entry updated.");
    // Refresh list from DB via optimistic update
    if (addingNew) {
      const tempId = crypto.randomUUID();
      onLeadershipChange([...leadership, { ...draft, id: tempId }].sort((a, b) => a.sort_order - b.sort_order));
    } else {
      onLeadershipChange(
        leadership.map((e) => e.id === draft.id ? { ...draft, id: draft.id! } : e).sort((a, b) => a.sort_order - b.sort_order)
      );
    }
    cancelEdit();
  }

  async function remove(id: string) {
    const res = await deleteLeadershipEntry(id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Entry removed.");
    onLeadershipChange(leadership.filter((e) => e.id !== id));
  }

  function move(id: string, dir: "up" | "down") {
    const sorted = [...leadership].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((e) => e.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const updated = sorted.map((e, i) => {
      if (i === idx) return { ...e, sort_order: sorted[swapIdx].sort_order };
      if (i === swapIdx) return { ...e, sort_order: sorted[idx].sort_order };
      return e;
    }).sort((a, b) => a.sort_order - b.sort_order);
    onLeadershipChange(updated);
    // Persist both swapped entries
    upsertLeadershipEntry(updated[dir === "up" ? idx - 1 : idx + 1]);
    upsertLeadershipEntry(updated[dir === "up" ? idx : idx - 1]);
  }

  const sorted = [...leadership].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mt-4 space-y-6">
      {/* Public Site Toggle */}
      <Card className={`p-5 border-2 ${settings.public_site_enabled ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50"}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {settings.public_site_enabled ? (
                <span className="inline-flex items-center gap-1.5 text-green-700"><Globe className="h-4 w-4" /> Public Website — LIVE</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700"><Globe className="h-4 w-4" /> Public Website — OFFLINE</span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {settings.public_site_enabled
                ? "All public pages (About, Leadership, Trainings, Join, Alumni, etc.) are accessible to anyone with the URL."
                : "All public pages are hidden. Visitors see a \"Not available\" message. Portal login still works."}
            </p>
          </div>
          <Button
            onClick={togglePublicSite}
            disabled={togglingPublic}
            className={settings.public_site_enabled
              ? "bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              : "bg-green-700 hover:bg-green-800 text-white shrink-0"}
          >
            {togglingPublic ? "Saving…" : settings.public_site_enabled ? "Take Offline" : "Bring Online"}
          </Button>
        </div>
      </Card>

      {/* Command Staff */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Command Staff</h3>
            <p className="text-xs text-gray-400 mt-0.5">Displayed on the public About page under Leadership.</p>
          </div>
          {!addingNew && (
            <Button size="sm" onClick={startAdd} className="bg-[#003087] hover:bg-[#002266]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Entry
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {sorted.map((entry, idx) => (
            <div key={entry.id}>
              {editingId === entry.id ? (
                <LeadershipForm
                  draft={draft}
                  onChange={setDraft}
                  onSave={save}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(entry.id, "up")} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => move(entry.id, "down")} disabled={idx === sorted.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#003087]/10 text-xs font-black text-[#003087]">
                    {entry.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{entry.name}</p>
                    <p className="text-xs text-gray-400">{entry.title}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(entry)}>
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 hover:bg-gray-100">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {entry.name}?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove them from the public About page immediately.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(entry.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}

          {addingNew && (
            <LeadershipForm
              draft={draft}
              onChange={setDraft}
              onSave={save}
              onCancel={cancelEdit}
              saving={saving}
              isNew
            />
          )}

          {sorted.length === 0 && !addingNew && (
            <p className="text-center text-sm text-gray-400 py-6">No entries yet. Add your first staff member.</p>
          )}
        </div>
      </Card>

      {/* Trainings */}
      <TrainingsSection trainings={trainings} onChange={onTrainingsChange} />

      {/* Alumni */}
      <AlumniSection alumni={alumni} onChange={onAlumniChange} />

      {/* FAQs */}
      <FAQSection faqs={faqs} onChange={onFaqsChange} />

      <p className="text-xs text-gray-400">
        Changes take effect on the public site immediately after saving. Visit{" "}
        <a href="/about" target="_blank" className="underline hover:text-gray-600">/about</a> to preview leadership,{" "}
        <a href="/trainings" target="_blank" className="underline hover:text-gray-600">/trainings</a> for the catalog,{" "}
        <a href="/alumni" target="_blank" className="underline hover:text-gray-600">/alumni</a> for alumni stories,{" "}
        <a href="/join" target="_blank" className="underline hover:text-gray-600">/join</a> for FAQs.
      </p>
    </div>
  );
}

function LeadershipForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  draft: Omit<LeadershipEntry, "id"> & { id?: string };
  onChange: (d: Omit<LeadershipEntry, "id"> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#003087]/20 bg-[#003087]/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#003087]">
        {isNew ? "New Entry" : "Edit Entry"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label className="text-xs">Title / Role</Label>
          <Input
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="Commanding Officer"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-xs">Name &amp; Rank</Label>
          <Input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="LTJG Smith"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-xs">Initials</Label>
          <Input
            value={draft.initials}
            onChange={(e) => onChange({ ...draft, initials: e.target.value.toUpperCase().slice(0, 6) })}
            placeholder="CO"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Input
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          placeholder="Brief description of this role..."
          className="mt-1 h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Trainings Section ────────────────────────────────────────────────────────

const EMPTY_TRAINING: Omit<TrainingEntry, "id"> = {
  category: "",
  category_tagline: "",
  name: "",
  location: "",
  duration: "",
  overview: "",
  what_you_do: [],
  what_you_earn: [],
  who_its_for: "",
  sort_order: 0,
  category_sort_order: 0,
};

function TrainingsSection({ trainings, onChange }: { trainings: TrainingEntry[]; onChange: (t: TrainingEntry[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<Omit<TrainingEntry, "id"> & { id?: string }>(EMPTY_TRAINING);
  const [saving, setSaving] = useState(false);

  const sorted = [...trainings].sort((a, b) =>
    a.category_sort_order !== b.category_sort_order
      ? a.category_sort_order - b.category_sort_order
      : a.sort_order - b.sort_order
  );

  const categories = Array.from(new Set(sorted.map((t) => t.category)));

  function startEdit(t: TrainingEntry) {
    setDraft(t);
    setEditingId(t.id);
    setAddingNew(false);
  }

  function startAdd() {
    const last = sorted[sorted.length - 1];
    setDraft({ ...EMPTY_TRAINING, category_sort_order: last?.category_sort_order ?? 0, sort_order: (last?.sort_order ?? -1) + 1 });
    setAddingNew(true);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setAddingNew(false);
    setDraft(EMPTY_TRAINING);
  }

  async function save() {
    if (!draft.category || !draft.name) { toast.error("Category and name are required."); return; }
    setSaving(true);
    const res = await upsertTrainingEntry(draft);
    setSaving(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(addingNew ? "Training added." : "Training updated.");
    if (addingNew) {
      const tempId = crypto.randomUUID();
      onChange([...trainings, { ...draft, id: tempId }]);
    } else {
      onChange(trainings.map((t) => t.id === draft.id ? { ...draft, id: draft.id! } : t));
    }
    cancelEdit();
  }

  async function remove(id: string) {
    const res = await deleteTrainingEntry(id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Training removed.");
    onChange(trainings.filter((t) => t.id !== id));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Training Catalog</h3>
          <p className="text-xs text-gray-400 mt-0.5">Displayed on the public Trainings page. {sorted.length} training{sorted.length !== 1 ? "s" : ""} in {categories.length} categor{categories.length !== 1 ? "ies" : "y"}.</p>
        </div>
        {!addingNew && (
          <Button size="sm" onClick={startAdd} className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Training
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">{cat}</p>
            <div className="space-y-1.5">
              {sorted.filter((t) => t.category === cat).map((t) => (
                <div key={t.id}>
                  {editingId === t.id ? (
                    <TrainingForm draft={draft} onChange={setDraft} onSave={save} onCancel={cancelEdit} saving={saving} />
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.location} · {t.duration}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(t)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger>
                            <button className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 hover:bg-gray-100">
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove {t.name}?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove it from the public Trainings page immediately.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(t.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {addingNew && (
          <TrainingForm draft={draft} onChange={setDraft} onSave={save} onCancel={cancelEdit} saving={saving} isNew />
        )}

        {sorted.length === 0 && !addingNew && (
          <p className="text-center text-sm text-gray-400 py-6">No trainings yet. Add your first training.</p>
        )}
      </div>
    </Card>
  );
}

function TrainingForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  draft: Omit<TrainingEntry, "id"> & { id?: string };
  onChange: (d: Omit<TrainingEntry, "id"> & { id?: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#003087]/20 bg-[#003087]/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#003087]">
        {isNew ? "New Training" : "Edit Training"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Category</Label>
          <Input value={draft.category} onChange={(e) => onChange({ ...draft, category: e.target.value })} placeholder="e.g. Aviation" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Category Tagline</Label>
          <Input value={draft.category_tagline} onChange={(e) => onChange({ ...draft, category_tagline: e.target.value })} placeholder="Short tagline for the category" className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Training Name</Label>
          <Input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="Full name of the training" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Location</Label>
          <Input value={draft.location} onChange={(e) => onChange({ ...draft, location: e.target.value })} placeholder="e.g. NAS Pensacola, FL" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Duration</Label>
          <Input value={draft.duration} onChange={(e) => onChange({ ...draft, duration: e.target.value })} placeholder="e.g. 7 days" className="mt-1 h-8 text-sm" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Overview</Label>
          <textarea
            value={draft.overview}
            onChange={(e) => onChange({ ...draft, overview: e.target.value })}
            placeholder="Overview description..."
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div>
          <Label className="text-xs">What You Do (one per line)</Label>
          <textarea
            value={draft.what_you_do.join("\n")}
            onChange={(e) => onChange({ ...draft, what_you_do: e.target.value.split("\n").filter(Boolean) })}
            placeholder="Each activity on its own line"
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div>
          <Label className="text-xs">What You Earn (one per line)</Label>
          <textarea
            value={draft.what_you_earn.join("\n")}
            onChange={(e) => onChange({ ...draft, what_you_earn: e.target.value.split("\n").filter(Boolean) })}
            placeholder="Each certification/rating on its own line"
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Who It&apos;s For</Label>
          <Input value={draft.who_its_for} onChange={(e) => onChange({ ...draft, who_its_for: e.target.value })} placeholder="Who is this training best suited for?" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Sort Order (within category)</Label>
          <Input type="number" value={draft.sort_order} onChange={(e) => onChange({ ...draft, sort_order: parseInt(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Category Sort Order</Label>
          <Input type="number" value={draft.category_sort_order} onChange={(e) => onChange({ ...draft, category_sort_order: parseInt(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Alumni Section ────────────────────────────────────────────────────────

const EMPTY_ALUMNI: Omit<AlumniEntry, "id"> = {
  name: "", years: "", rank: "", now_position: "", detail: "", trainings: [], sort_order: 0,
};

function AlumniSection({ alumni, onChange }: { alumni: AlumniEntry[]; onChange: (a: AlumniEntry[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<Omit<AlumniEntry, "id"> & { id?: string }>(EMPTY_ALUMNI);
  const [saving, setSaving] = useState(false);

  const sorted = [...alumni].sort((a, b) => a.sort_order - b.sort_order);

  async function save() {
    if (!draft.name || !draft.now_position) { toast.error("Name and current position are required."); return; }
    setSaving(true);
    const res = await upsertAlumniEntry(draft);
    setSaving(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(addingNew ? "Alumni story added." : "Alumni story updated.");
    if (addingNew) {
      onChange([...alumni, { ...draft, id: crypto.randomUUID() }].sort((a, b) => a.sort_order - b.sort_order));
    } else {
      onChange(alumni.map((e) => e.id === draft.id ? { ...draft, id: draft.id! } : e).sort((a, b) => a.sort_order - b.sort_order));
    }
    setEditingId(null); setAddingNew(false); setDraft(EMPTY_ALUMNI);
  }

  async function remove(id: string) {
    const res = await deleteAlumniEntry(id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Removed.");
    onChange(alumni.filter((e) => e.id !== id));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Alumni Stories</h3>
          <p className="text-xs text-gray-400 mt-0.5">Shown on the public /alumni page.</p>
        </div>
        {!addingNew && (
          <Button size="sm" onClick={() => { setDraft({ ...EMPTY_ALUMNI, sort_order: (sorted.at(-1)?.sort_order ?? 0) + 1 }); setAddingNew(true); setEditingId(null); }} className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Story
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {sorted.map((entry) => (
          <div key={entry.id}>
            {editingId === entry.id ? (
              <AlumniForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => { setEditingId(null); setDraft(EMPTY_ALUMNI); }} saving={saving} />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{entry.name} <span className="font-normal text-gray-400">· {entry.rank}</span></p>
                  <p className="text-xs text-gray-400 truncate">{entry.now_position}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDraft(entry); setEditingId(entry.id); setAddingNew(false); }}>
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 hover:bg-gray-100">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {entry.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This removes the story from the public alumni page.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(entry.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
        {addingNew && (
          <AlumniForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => { setAddingNew(false); setDraft(EMPTY_ALUMNI); }} saving={saving} isNew />
        )}
        {sorted.length === 0 && !addingNew && (
          <p className="text-center text-sm text-gray-400 py-6">No alumni stories yet.</p>
        )}
      </div>
    </Card>
  );
}

function AlumniForm({
  draft, onChange, onSave, onCancel, saving, isNew,
}: {
  draft: Omit<AlumniEntry, "id"> & { id?: string };
  onChange: (d: typeof draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#003087]/20 bg-blue-50/40 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[#003087]">{isNew ? "Add Alumni Story" : "Edit Story"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Jane D." />
        </div>
        <div>
          <Label className="text-xs">Years in Unit</Label>
          <Input value={draft.years} onChange={(e) => onChange({ ...draft, years: e.target.value })} className="mt-1 h-8 text-sm" placeholder="2019 – 2023" />
        </div>
        <div>
          <Label className="text-xs">Highest Rank</Label>
          <Input value={draft.rank} onChange={(e) => onChange({ ...draft, rank: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Petty Officer First Class" />
        </div>
        <div>
          <Label className="text-xs">Where They Are Now</Label>
          <Input value={draft.now_position} onChange={(e) => onChange({ ...draft, now_position: e.target.value })} className="mt-1 h-8 text-sm" placeholder="MIT — Computer Science" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Story / Detail</Label>
        <textarea
          value={draft.detail}
          onChange={(e) => onChange({ ...draft, detail: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
          placeholder="What did they accomplish? What did Sea Cadets do for them?"
        />
      </div>
      <div>
        <Label className="text-xs">Trainings Attended (one per line)</Label>
        <textarea
          value={draft.trainings.join("\n")}
          onChange={(e) => onChange({ ...draft, trainings: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
          placeholder="SCUBA Diving&#10;Leadership Academy"
        />
      </div>
      <div className="w-24">
        <Label className="text-xs">Sort Order</Label>
        <Input type="number" value={draft.sort_order} onChange={(e) => onChange({ ...draft, sort_order: parseInt(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
          <Check className="mr-1.5 h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────

const EMPTY_FAQ: Omit<FAQEntry, "id"> = { question: "", answer: "", sort_order: 0 };

function FAQSection({ faqs, onChange }: { faqs: FAQEntry[]; onChange: (f: FAQEntry[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [draft, setDraft] = useState<Omit<FAQEntry, "id"> & { id?: string }>(EMPTY_FAQ);
  const [saving, setSaving] = useState(false);

  const sorted = [...faqs].sort((a, b) => a.sort_order - b.sort_order);

  async function save() {
    if (!draft.question || !draft.answer) { toast.error("Question and answer are required."); return; }
    setSaving(true);
    const res = await upsertFAQEntry(draft);
    setSaving(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(addingNew ? "FAQ added." : "FAQ updated.");
    if (addingNew) {
      onChange([...faqs, { ...draft, id: crypto.randomUUID() }].sort((a, b) => a.sort_order - b.sort_order));
    } else {
      onChange(faqs.map((e) => e.id === draft.id ? { ...draft, id: draft.id! } : e).sort((a, b) => a.sort_order - b.sort_order));
    }
    setEditingId(null); setAddingNew(false); setDraft(EMPTY_FAQ);
  }

  async function remove(id: string) {
    const res = await deleteFAQEntry(id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Removed.");
    onChange(faqs.filter((e) => e.id !== id));
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">FAQs</h3>
          <p className="text-xs text-gray-400 mt-0.5">Shown on the public /join page.</p>
        </div>
        {!addingNew && (
          <Button size="sm" onClick={() => { setDraft({ ...EMPTY_FAQ, sort_order: (sorted.at(-1)?.sort_order ?? 0) + 1 }); setAddingNew(true); setEditingId(null); }} className="bg-[#003087] hover:bg-[#002266]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add FAQ
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {sorted.map((entry) => (
          <div key={entry.id}>
            {editingId === entry.id ? (
              <FAQForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => { setEditingId(null); setDraft(EMPTY_FAQ); }} saving={saving} />
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{entry.question}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.answer}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setDraft(entry); setEditingId(entry.id); setAddingNew(false); }}>
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 hover:bg-gray-100">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this FAQ?</AlertDialogTitle>
                        <AlertDialogDescription>This removes it from the public join page.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(entry.id)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        ))}
        {addingNew && (
          <FAQForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => { setAddingNew(false); setDraft(EMPTY_FAQ); }} saving={saving} isNew />
        )}
        {sorted.length === 0 && !addingNew && (
          <p className="text-center text-sm text-gray-400 py-6">No FAQs yet.</p>
        )}
      </div>
    </Card>
  );
}

function FAQForm({
  draft, onChange, onSave, onCancel, saving, isNew,
}: {
  draft: Omit<FAQEntry, "id"> & { id?: string };
  onChange: (d: typeof draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#003087]/20 bg-blue-50/40 p-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[#003087]">{isNew ? "Add FAQ" : "Edit FAQ"}</p>
      <div>
        <Label className="text-xs">Question</Label>
        <Input value={draft.question} onChange={(e) => onChange({ ...draft, question: e.target.value })} className="mt-1 h-8 text-sm" placeholder="Is there a cost to join?" />
      </div>
      <div>
        <Label className="text-xs">Answer</Label>
        <textarea
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
          placeholder="Membership is free…"
        />
      </div>
      <div className="w-24">
        <Label className="text-xs">Sort Order</Label>
        <Input type="number" value={draft.sort_order} onChange={(e) => onChange({ ...draft, sort_order: parseInt(e.target.value) || 0 })} className="mt-1 h-8 text-sm" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onSave} disabled={saving} className="bg-[#003087] hover:bg-[#002266]">
          <Check className="mr-1.5 h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}
