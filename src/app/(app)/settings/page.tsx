import { Suspense } from "react";
import { requireProfile } from "@/lib/profile";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const profile = await requireProfile();
  return (
    <Suspense>
      <SettingsClient profile={profile} />
    </Suspense>
  );
}
