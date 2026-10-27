"use client";

// Re-exports the unified absence-request modal pre-set to early_leave type.
import { AbsenceRequestButton } from "./absence-request-button";
import type { Profile } from "@/types/database";

export function EarlyLeaveRequestButton({ profile }: { profile: Profile }) {
  return (
    <AbsenceRequestButton
      profile={profile}
      defaultType="early_leave"
      buttonLabel="Early Dismissal"
    />
  );
}
