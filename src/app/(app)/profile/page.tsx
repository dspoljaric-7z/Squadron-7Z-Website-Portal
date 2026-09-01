import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CadetProfileView } from "@/components/profile/cadet-profile-view";

export default async function MyProfilePage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const targetId = viewer.id;

  if (viewer.role === "officer" || viewer.role === "snco" || viewer.role === "nco") redirect(`/cadets/${viewer.id}`);

  const [{ data: cadet }, { data: attendance }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", targetId).single(),
    supabase.from("attendance").select("*, events(title, start_time)").eq("cadet_id", targetId).order("recorded_at", { ascending: false }),
  ]);

  if (!cadet) {
    return (
      <div className="rounded-md border bg-white p-6 text-sm text-gray-500">
        Profile not found.
      </div>
    );
  }

  return (
    <CadetProfileView
      viewer={viewer}
      cadet={cadet}
      initialAttendance={(attendance ?? []) as never}
      initialNotes={[]}
    />
  );
}
