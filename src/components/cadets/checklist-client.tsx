"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CheckSquare, Square, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ONBOARDING_STEPS = [
  { key: "account_created", label: "Portal account created" },
  { key: "paperwork_submitted", label: "Required paperwork submitted" },
  { key: "uniform_issued", label: "Uniform issued" },
  { key: "first_inspection_passed", label: "First inspection passed" },
  { key: "qual_brief_done", label: "Qualification brief completed" },
];

const SEPARATION_STEPS = [
  { key: "gear_returned", label: "Gear / uniform returned" },
  { key: "account_deactivated", label: "Portal account deactivated" },
  { key: "records_archived", label: "Records archived" },
  { key: "transfer_docs_sent", label: "Transfer documents sent" },
  { key: "exit_interview_done", label: "Exit interview completed" },
];

type ChecklistRow = {
  id: string;
  cadet_id: string;
  type: "onboarding" | "separation";
  step: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
};

export function ChecklistClient({
  cadetId,
  type,
  initialRows,
  canEdit,
}: {
  cadetId: string;
  cadetName?: string;
  type: "onboarding" | "separation";
  initialRows: ChecklistRow[];
  canEdit: boolean;
}) {
  const steps = type === "onboarding" ? ONBOARDING_STEPS : SEPARATION_STEPS;
  const [rows, setRows] = useState<ChecklistRow[]>(initialRows);
  const [saving, setSaving] = useState<string | null>(null);

  const getRow = (key: string) => rows.find((r) => r.step === key);
  const completedCount = steps.filter((s) => getRow(s.key)?.completed).length;

  const toggle = async (stepKey: string) => {
    if (!canEdit) return;
    const existing = getRow(stepKey);
    setSaving(stepKey);
    const supabase = createClient();

    if (existing) {
      const { data, error } = await supabase
        .from("cadet_checklists" as never)
        .update({
          completed: !existing.completed,
          completed_at: !existing.completed ? new Date().toISOString() : null,
        } as never)
        .eq("id", existing.id)
        .select()
        .single();
      setSaving(null);
      if (error) { toast.error(error.message); return; }
      setRows((prev) => prev.map((r) => r.id === existing.id ? data as unknown as ChecklistRow : r));
    } else {
      const { data, error } = await supabase
        .from("cadet_checklists" as never)
        .insert({
          cadet_id: cadetId,
          type,
          step: stepKey,
          completed: true,
          completed_at: new Date().toISOString(),
        } as never)
        .select()
        .single();
      setSaving(null);
      if (error) { toast.error(error.message); return; }
      setRows((prev) => [...prev, data as unknown as ChecklistRow]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#003087]" />
          <span className="text-sm font-semibold text-gray-800">
            {type === "onboarding" ? "In-Processing" : "Separation"} Checklist
          </span>
        </div>
        <Badge variant="outline" className={completedCount === steps.length ? "border-green-300 text-green-700 bg-green-50" : ""}>
          {completedCount}/{steps.length}
        </Badge>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {steps.map(({ key, label }, idx) => {
          const row = getRow(key);
          const done = row?.completed ?? false;
          const isSaving = saving === key;
          return (
            <div
              key={key}
              onClick={() => !isSaving && toggle(key)}
              className={`flex items-center gap-3 px-4 py-3 ${idx < steps.length - 1 ? "border-b" : ""} ${
                canEdit ? "cursor-pointer hover:bg-gray-50" : ""
              } transition-colors ${done ? "bg-green-50/50" : ""}`}
            >
              {done
                ? <CheckSquare className="h-4 w-4 shrink-0 text-green-600" />
                : <Square className="h-4 w-4 shrink-0 text-gray-300" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? "text-gray-500 line-through" : "text-gray-800"}`}>{label}</p>
                {done && row?.completed_at && (
                  <p className="text-xs text-gray-400">{format(new Date(row.completed_at), "MMM d, yyyy")}</p>
                )}
              </div>
              {isSaving && <span className="text-xs text-gray-400">…</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
