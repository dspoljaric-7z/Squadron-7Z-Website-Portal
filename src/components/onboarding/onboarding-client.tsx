"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Users } from "lucide-react";

type Step = { id: string; title: string; description: string | null; sort_order: number; required: boolean };
type ProgressRow = { cadet_id: string; step_id: string; completed: boolean; notes: string | null };
type Cadet = { id: string; full_name: string; rank: string | null; role: string };

interface OnboardingClientProps {
  steps: Step[];
  progress: ProgressRow[];
  profile: { id: string; full_name: string };
  isStaff: boolean;
  cadets: Cadet[];
}

export function OnboardingClient({ steps, progress, profile, isStaff, cadets }: OnboardingClientProps) {
  const [selectedCadetId, setSelectedCadetId] = useState<string | null>(isStaff ? (cadets[0]?.id ?? null) : profile.id);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressRow>>(() => {
    const m = new Map<string, ProgressRow>();
    for (const row of progress) m.set(`${row.cadet_id}:${row.step_id}`, row);
    return m;
  });
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const targetId = isStaff ? selectedCadetId : profile.id;

  const getRow = (stepId: string) => progressMap.get(`${targetId}:${stepId}`);
  const isCompleted = (stepId: string) => getRow(stepId)?.completed ?? false;

  const completedCount = steps.filter((s) => isCompleted(s.id)).length;
  const requiredCount = steps.filter((s) => s.required).length;
  const requiredDone = steps.filter((s) => s.required && isCompleted(s.id)).length;

  const handleToggle = async (stepId: string) => {
    if (!targetId) return;
    const key = `${targetId}:${stepId}`;
    const current = progressMap.get(key);
    const newCompleted = !(current?.completed ?? false);

    setSaving(stepId);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("cadet_onboarding")
      .upsert({
        cadet_id: targetId,
        step_id: stepId,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: profile.id,
      }, { onConflict: "cadet_id,step_id" });

    if (!error) {
      setProgressMap((prev) => {
        const next = new Map(prev);
        next.set(key, { cadet_id: targetId, step_id: stepId, completed: newCompleted, notes: current?.notes ?? null });
        return next;
      });
    }
    setSaving(null);
  };

  const selectedCadet = cadets.find((c) => c.id === selectedCadetId);

  return (
    <div className="space-y-4">
      {/* Staff cadet selector */}
      {isStaff && cadets.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <Users className="h-4 w-4 shrink-0 text-[#003087]" />
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Viewing cadet:</label>
          <select
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#003087]/20"
            value={selectedCadetId ?? ""}
            onChange={(e) => setSelectedCadetId(e.target.value || null)}
          >
            <option value="">— select a cadet —</option>
            {cadets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rank ? `${c.rank} ` : ""}{c.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress summary */}
      {targetId && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {isStaff && selectedCadet ? `${selectedCadet.full_name}'s Progress` : "My Progress"}
              </p>
              <p className="text-xs text-gray-400">
                {completedCount} of {steps.length} steps complete · {requiredDone}/{requiredCount} required
              </p>
            </div>
            <span className={cn(
              "text-sm font-bold",
              requiredDone === requiredCount ? "text-green-600" : "text-[#003087]"
            )}>
              {Math.round((completedCount / steps.length) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-[#003087] transition-all duration-300"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          {requiredDone === requiredCount && (
            <p className="mt-2 text-xs font-medium text-green-600">
              All required steps complete!
            </p>
          )}
        </div>
      )}

      {/* Steps list */}
      {targetId ? (
        <div className="space-y-2">
          {steps.map((step) => {
            const done = isCompleted(step.id);
            const expanded = expandedStep === step.id;
            const isSaving = saving === step.id;
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border bg-white transition-all",
                  done ? "border-green-200" : "border-gray-200"
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  <button
                    onClick={() => handleToggle(step.id)}
                    disabled={isSaving}
                    className="mt-0.5 shrink-0 transition-opacity disabled:opacity-50"
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", done ? "text-gray-400 line-through" : "text-gray-800")}>
                        {step.title}
                      </p>
                      {step.required && !done && (
                        <span className="rounded bg-[#003087]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#003087]">
                          Required
                        </span>
                      )}
                    </div>
                    {step.description && !expanded && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{step.description}</p>
                    )}
                    {step.description && expanded && (
                      <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{step.description}</p>
                    )}
                  </div>
                  {step.description && (
                    <button
                      onClick={() => setExpandedStep(expanded ? null : step.id)}
                      className="shrink-0 text-gray-300 hover:text-gray-500"
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-400">
          <p className="text-sm">Select a cadet above to view their checklist.</p>
        </div>
      )}
    </div>
  );
}
