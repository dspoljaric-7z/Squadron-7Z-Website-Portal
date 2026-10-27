import { requireProfile } from "@/lib/profile";
import { isStaff } from "@/lib/permissions";
import { getDrillSuggestions } from "./actions";
import { DrillSuggestionsClient } from "@/components/drill-suggestions/drill-suggestions-client";

export default async function DrillSuggestionsPage() {
  const profile = await requireProfile();
  const suggestions = await getDrillSuggestions();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003087]">Drill Ideas</h1>
        <p className="text-sm text-gray-500">
          Suggest a drill, event, or training idea. Officers can pull these into the Plan of the Day.
        </p>
      </div>
      <DrillSuggestionsClient
        initialSuggestions={suggestions}
        isStaff={isStaff(profile)}
        myProfileId={profile.id}
      />
    </div>
  );
}
