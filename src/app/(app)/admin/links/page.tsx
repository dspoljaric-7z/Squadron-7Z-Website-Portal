import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions";
import { SavedLinksAdmin } from "@/components/admin/saved-links-admin";

export default async function AdminLinksPage() {
  const profile = await requireProfile();
  if (!isStaff(profile)) redirect("/dashboard");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: links } = await sb
    .from("saved_links")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003087]">Quick Links</h1>
        <p className="text-sm text-gray-500">
          Manage the quick links shown on the dashboard for all members.
        </p>
      </div>
      <SavedLinksAdmin initialLinks={links ?? []} profileId={profile.id} />
    </div>
  );
}
