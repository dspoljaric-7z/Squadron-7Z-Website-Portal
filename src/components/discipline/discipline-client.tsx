"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shirt, FileWarning, AlertTriangle } from "lucide-react";
import { InspectionsClient } from "@/components/inspections/inspections-client";
import { CorrectionsClient } from "@/components/corrections/corrections-client";
import { OtherIssuesClient } from "@/components/other-issues/other-issues-client";
import type { Profile } from "@/types/database";
import { HintButton } from "@/components/shared/hint-button";

const DISCIPLINE_HINTS = [
  { heading: "Inspections tab", body: "Log uniform inspection scores after each drill. Enter each cadet's score (0–100). Scores feed the cadet's overall record." },
  { heading: "Corrections tab", body: "Record uniform corrections issued during inspection. Select the cadet, describe the item, and save. Cadets can see their own corrections on their record." },
  { heading: "PIPs (Performance Improvement Plans)", body: "Open a new PIP from the Corrections tab for serious or repeat issues. Fill in the plan details and set a review date. Active PIPs show on the staff dashboard count." },
  { heading: "Other Issues tab", body: "Use this for non-uniform disciplinary matters — behavioral issues, safety violations, etc. These are staff-only and do not appear on cadet self-service views." },
];

type Props = {
  defaultTab: string;
  profile: Profile;
  isCommand: boolean;
  initialSessions: Parameters<typeof InspectionsClient>[0]["initialSessions"];
  initialCorrections: Parameters<typeof CorrectionsClient>[0]["initialCorrections"];
  initialPips: Parameters<typeof CorrectionsClient>[0]["initialPips"];
  initialIssues: Parameters<typeof OtherIssuesClient>[0]["initialIssues"];
  cadets: Parameters<typeof InspectionsClient>[0]["allProfiles"];
  staffProfiles?: Parameters<typeof CorrectionsClient>[0]["staffProfiles"];
};

export function DisciplineClient({
  defaultTab,
  profile,
  isCommand,
  initialSessions,
  initialCorrections,
  initialPips,
  initialIssues,
  cadets,
  staffProfiles = [],
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState(defaultTab);

  const handleTab = (t: string) => {
    setTab(t);
    router.replace(`/discipline?tab=${t}`, { scroll: false });
  };

  const tabs = [
    { value: "inspections", label: "Inspections", icon: Shirt },
    { value: "corrections", label: "Corrections & PIPs", icon: FileWarning },
    ...(isCommand ? [{ value: "other-issues", label: "Other Issues", icon: AlertTriangle }] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Discipline</h1>
          <HintButton title="Discipline" hints={DISCIPLINE_HINTS} />
        </div>
        <p className="text-sm text-gray-500">Uniform inspections, corrections, PIPs, and issue tracking</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleTab(value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === value
                  ? "border-[#003087] text-[#003087]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "inspections" && (
        <InspectionsClient currentProfile={profile} initialSessions={initialSessions} allProfiles={cadets} recentDrills={[]} inspectionItems={[]} canManageItems={false} />
      )}
      {tab === "corrections" && (
        <CorrectionsClient
          initialCorrections={initialCorrections}
          initialPips={initialPips}
          cadets={cadets}
          profile={profile}
          staffProfiles={staffProfiles}
        />
      )}
      {isCommand && tab === "other-issues" && (
        <OtherIssuesClient initialIssues={initialIssues} cadets={cadets} profile={profile} />
      )}
    </div>
  );
}
