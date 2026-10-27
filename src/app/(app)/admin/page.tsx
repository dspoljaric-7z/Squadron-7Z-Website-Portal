import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isCommand } from "@/lib/permissions";
import { AdminClient } from "@/components/admin/admin-client";
import type { LeadershipEntry, TrainingEntry, AlumniEntry, FAQEntry } from "./actions";
import type { IncidentReport } from "@/app/(app)/incidents/actions";

export default async function AdminPage() {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco" && !profile.is_yeoman) redirect("/dashboard");

  const supabase = await createClient();
  const [
    { data: users },
    { data: inviteCodes },
    { data: settingsRows },
    { data: divisions },
    { data: leadership },
    { data: trainings },
    { data: alumni },
    { data: faqs },
    { data: allowedEmails },
    { data: incidentReports },
    { data: accessProfiles },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("invite_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", 1),
    supabase.from("divisions").select("id, name").order("name"),
    supabase.from("leadership" as never).select("*").order("sort_order", { ascending: true }),
    supabase.from("trainings" as never).select("*").order("category_sort_order", { ascending: true }).order("sort_order", { ascending: true }),
    supabase.from("public_alumni" as never).select("*").order("sort_order", { ascending: true }),
    supabase.from("public_faqs" as never).select("*").order("sort_order", { ascending: true }),
    supabase.from("allowed_emails").select("*").order("created_at", { ascending: false }),
    supabase.from("incident_reports" as never).select("*").order("incident_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email, role, is_command, is_maa, is_yeoman, is_ops, is_alpo, is_lcpo, can_manage_recruiting, can_manage_advancement, can_manage_drills, can_manage_discipline, can_manage_ideas, can_manage_pod, active, approved").order("full_name"),
  ]);

  const auditLogRes = isCommand(profile)
    ? await supabase
        .from("audit_log" as never)
        .select("*, actor:profiles!audit_log_actor_id_fkey(full_name, rank, role)")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: null };

  return (
    <AdminClient
      profile={profile}
      initialUsers={users ?? []}
      initialInviteCodes={inviteCodes ?? []}
      initialSettings={settingsRows?.[0] ?? null}
      divisions={divisions ?? []}
      initialLeadership={(leadership ?? []) as LeadershipEntry[]}
      initialTrainings={(trainings ?? []) as TrainingEntry[]}
      initialAlumni={(alumni ?? []) as AlumniEntry[]}
      initialFaqs={(faqs ?? []) as FAQEntry[]}
      initialAllowedEmails={(allowedEmails ?? []) as never}
      initialIncidents={(incidentReports ?? []) as IncidentReport[]}
      initialAccessProfiles={(accessProfiles ?? []) as never}
      initialAuditEntries={(auditLogRes.data ?? []) as never[]}
    />
  );
}
