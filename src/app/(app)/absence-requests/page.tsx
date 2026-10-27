import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff, isDivisionLeader } from "@/lib/permissions";
import { AbsenceRequestsManager } from "@/components/absence-requests/absence-requests-manager";

export default async function AbsenceRequestsPage() {
  const profile = await requireProfile();
  if (!isStaff(profile) && !isDivisionLeader(profile)) redirect("/dashboard");

  const supabase = await createClient();

  const { data: rawRequests } = await supabase
    .from("absence_requests")
    .select("id, cadet_id, requested_date, request_type, source, reason, makeup_plan, departure_time, status, review_notes, created_at, cadet:profiles!absence_requests_cadet_id_fkey(full_name, rank, division_id)")
    .order("requested_date", { ascending: false })
    .limit(100);

  // DPO / NCO division leaders only see their division's cadets — filter post-fetch since
  // PostgREST doesn't support filtering on embedded relation columns via .eq()
  const divLeader = !isStaff(profile) && isDivisionLeader(profile);
  const requests = divLeader && profile.division_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (rawRequests ?? []).filter((r: any) => r.cadet?.division_id === profile.division_id)
    : (rawRequests ?? []);

  const pending = requests.filter((r: { status: string }) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003087]">Absence Requests</h1>
        <p className="text-sm text-gray-500">
          {pending > 0 ? `${pending} pending review` : "All requests reviewed"}
        </p>
      </div>
      <AbsenceRequestsManager
        initialRequests={requests as never}
        profile={profile}
      />
    </div>
  );
}
