"use client";

// Re-exports the unified absence-request modal pre-set to late_arrival type.
import { AbsenceRequestButton } from "./absence-request-button";
import type { Profile } from "@/types/database";

export function LateArrivalRequestButton({ profile }: { profile: Profile }) {
  return (
    <AbsenceRequestButton
      profile={profile}
      defaultType="late_arrival"
      buttonLabel="Late Arrival"
    />
  );
}
