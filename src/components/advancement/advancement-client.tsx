"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Trophy, ChevronsUp } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const ADVANCEMENT_HINTS = [
  { heading: "Nominations tab", body: "Submit billet nominations for upcoming boards. Select the cadet, the billet being nominated for, and add a justification. Nominations are visible to board members." },
  { heading: "Board Results tab", body: "After a board meets, enter the results here — which cadets were selected for which billets. Results are linked to cadet records." },
  { heading: "Bulk Rank Update", body: "Use this to promote or update multiple cadets' ranks at once after a formal advancement ceremony. Select cadets and the new rank, then confirm." },
];
import { NominationsClient } from "@/components/nominations/nominations-client";
import { BoardResultsClient } from "@/components/board-results/board-results-client";
import { BulkRankClient } from "@/components/advancement/bulk-rank-client";
import type { Profile } from "@/types/database";

type RubricCategory = { id: string; name: string; description: string | null; max_score: number; sort_order: number };
type BulkCadet = { id: string; full_name: string; rank: string | null; role: string };

type Props = {
  defaultTab: string;
  profile: Profile;
  canPost: boolean;
  canNominate: boolean;
  initialNominations: Parameters<typeof NominationsClient>[0]["initialNominations"];
  initialBoardResults: Parameters<typeof BoardResultsClient>[0]["initialResults"];
  cadets: Parameters<typeof NominationsClient>[0]["cadets"];
  billets: Parameters<typeof NominationsClient>[0]["billets"];
  boardCadets: Parameters<typeof BoardResultsClient>[0]["cadets"];
  bulkRankCadets?: BulkCadet[];
  commandStaff?: Parameters<typeof NominationsClient>[0]["commandStaff"];
  rubricCategories?: RubricCategory[];
};

export function AdvancementClient({
  defaultTab,
  profile,
  canPost,
  canNominate,
  initialNominations,
  initialBoardResults,
  cadets,
  billets,
  boardCadets,
  bulkRankCadets = [],
  commandStaff = [],
  rubricCategories = [],
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState(defaultTab);

  const handleTab = (t: string) => {
    setTab(t);
    router.replace(`/advancement?tab=${t}`, { scroll: false });
  };

  const tabs = [
    ...(canNominate ? [{ value: "nominations", label: "Nominations", icon: TrendingUp }] : []),
    { value: "board-results", label: "Board Results", icon: Trophy },
    ...(canPost ? [{ value: "bulk-rank", label: "Bulk Rank", icon: ChevronsUp }] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Advancement</h1>
          <HintButton title="Advancement" hints={ADVANCEMENT_HINTS} />
        </div>
        <p className="text-sm text-gray-500">Billet nominations and board results</p>
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

      {canNominate && tab === "nominations" && (
        <NominationsClient
          initialNominations={initialNominations}
          cadets={cadets}
          billets={billets}
          profile={profile}
          commandStaff={commandStaff}
          rubricCategories={rubricCategories}
        />
      )}
      {tab === "board-results" && (
        <BoardResultsClient
          profile={profile}
          initialResults={initialBoardResults}
          cadets={boardCadets}
          canPost={canPost}
        />
      )}
      {canPost && tab === "bulk-rank" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Select cadets who advanced at the last board and apply their new rank in bulk.</p>
          <BulkRankClient cadets={bulkRankCadets} />
        </div>
      )}
    </div>
  );
}
