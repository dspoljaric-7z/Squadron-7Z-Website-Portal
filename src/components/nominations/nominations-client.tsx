"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, AlertTriangle, ChevronDown, ChevronUp, Star, Clock, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { isCommand } from "@/lib/permissions";
import { NOMINATION_STAGE_LABELS, NOMINATION_STAGE_COLORS, QUAL_STATUS_COLORS } from "@/lib/constants";
import { advanceNominationStage, submitNominationEval, submitDynamicNominationEval } from "@/app/(app)/settings/actions";
import type { Profile, BilletNomination, NominationStage } from "@/types/database";

type NominationRow = BilletNomination & {
  cadet: { full_name: string; rank: string | null } | null;
  nominator: { full_name: string } | null;
  approver: { full_name: string } | null;
  board_member_ids?: string[];
};

type StageHistory = {
  id: string;
  nomination_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by_display: string | null;
  changed_at: string;
  reason: string | null;
};

type NominationEval = {
  id: string;
  nomination_id: string;
  evaluator_id: string;
  leadership: number | null;
  character: number | null;
  technical_knowledge: number | null;
  military_bearing: number | null;
  teamwork: number | null;
  physical_fitness: number | null;
  comments: string | null;
  submitted_at: string;
};

type DynamicEvalScore = { category_id: string; category_name: string; score: number };
type DynamicEval = {
  evaluator_id: string;
  overall_comments: string | null;
  submitted_at: string;
  scores: DynamicEvalScore[];
};

type RubricCategory = { id: string; name: string; description: string | null; max_score: number; sort_order: number };

const STAGES: NominationStage[] = ["nominated", "applied", "interviewed", "approved_probation", "confirmed", "not_selected"];

const EVAL_CRITERIA: { key: keyof Omit<NominationEval, "id" | "nomination_id" | "evaluator_id" | "comments" | "submitted_at">; label: string }[] = [
  { key: "leadership", label: "Leadership" },
  { key: "character", label: "Character" },
  { key: "technical_knowledge", label: "Technical Knowledge" },
  { key: "military_bearing", label: "Military Bearing" },
  { key: "teamwork", label: "Teamwork" },
  { key: "physical_fitness", label: "Physical Fitness" },
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className={`transition-colors ${n <= value ? "text-amber-400" : "text-gray-200 hover:text-amber-200"}`}>
          <Star className="h-5 w-5 fill-current" />
        </button>
      ))}
    </div>
  );
}

export function NominationsClient({
  initialNominations,
  cadets,
  billets,
  profile,
  commandStaff = [],
  rubricCategories = [],
}: {
  initialNominations: NominationRow[];
  cadets: { id: string; full_name: string; rank: string | null }[];
  billets?: { id: string; name: string }[];
  profile: Profile;
  commandStaff?: { id: string; full_name: string; rank: string | null }[];
  rubricCategories?: RubricCategory[];
}) {
  const router = useRouter();
  const [nominations, setNominations] = useState(initialNominations);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pipBlock, setPipBlock] = useState<string | null>(null);
  const [cadetQuals, setCadetQuals] = useState<{ qual_type: string; status: string }[]>([]);
  const [form, setForm] = useState({ cadet_id: "", billet_name: "", billet_id: "", notes: "", probation_end_date: "" });

  // Stage history & evals keyed by nomination id
  const [histories, setHistories] = useState<Record<string, StageHistory[]>>({});
  const [evals, setEvals] = useState<Record<string, NominationEval[]>>({});
  const [expanded, setExpanded] = useState<Record<string, "timeline" | "eval" | null>>({});

  // Stage advance dialogs
  const [rejectDialog, setRejectDialog] = useState<{ id: string; billetName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [boardDialog, setBoardDialog] = useState<{ id: string; billetName: string; current: string[] } | null>(null);
  const [boardSelected, setBoardSelected] = useState<string[]>([]);
  const [advancing, setAdvancing] = useState<string | null>(null);

  // Dynamic evals (from nomination_eval_scores when rubricCategories is provided)
  const [dynamicEvals, setDynamicEvals] = useState<Record<string, DynamicEval[]>>({});

  // Eval form
  const [evalForm, setEvalForm] = useState<Record<string, number>>({});
  const [evalComments, setEvalComments] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  const useDynamic = rubricCategories.length > 0;

  const canApprove = isCommand(profile);

  const checkPip = async (cadetId: string) => {
    if (!cadetId) { setPipBlock(null); setCadetQuals([]); return; }
    const supabase = createClient();
    const [{ data: pips }, { data: quals }] = await Promise.all([
      supabase.from("pips").select("id").eq("cadet_id", cadetId).eq("status", "open").limit(1),
      supabase.from("qualifications").select("qual_type, status").eq("cadet_id", cadetId),
    ]);
    if (pips && pips.length > 0) {
      const cadet = cadets.find((c) => c.id === cadetId);
      setPipBlock(`${cadet?.full_name ?? "This cadet"} has an open PIP (Correction Manual §2.3).`);
    } else {
      setPipBlock(null);
    }
    setCadetQuals((quals ?? []) as { qual_type: string; status: string }[]);
  };

  const loadHistory = async (nomId: string) => {
    if (histories[nomId]) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("nomination_stage_history")
      .select("*")
      .eq("nomination_id", nomId)
      .order("changed_at", { ascending: true });
    setHistories((prev) => ({ ...prev, [nomId]: (data as unknown as StageHistory[]) ?? [] }));
  };

  const loadEvals = async (nomId: string) => {
    if (evals[nomId]) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("nomination_evals")
      .select("*")
      .eq("nomination_id", nomId);
    setEvals((prev) => ({ ...prev, [nomId]: (data as unknown as NominationEval[]) ?? [] }));
  };

  const loadDynamicEvals = async (nomId: string) => {
    if (dynamicEvals[nomId]) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("nomination_eval_scores" as never)
      .select("evaluator_id, overall_comments, submitted_at, category_id, score, nomination_rubric_categories(name)")
      .eq("nomination_id", nomId);
    if (!data) { setDynamicEvals((prev) => ({ ...prev, [nomId]: [] })); return; }
    // Group by evaluator_id
    const byEval: Record<string, DynamicEval> = {};
    for (const row of data as never as { evaluator_id: string; overall_comments: string | null; submitted_at: string; category_id: string; score: number; nomination_rubric_categories: { name: string } | null }[]) {
      if (!byEval[row.evaluator_id]) {
        byEval[row.evaluator_id] = { evaluator_id: row.evaluator_id, overall_comments: row.overall_comments, submitted_at: row.submitted_at, scores: [] };
      }
      byEval[row.evaluator_id].scores.push({ category_id: row.category_id, category_name: row.nomination_rubric_categories?.name ?? row.category_id, score: row.score });
    }
    setDynamicEvals((prev) => ({ ...prev, [nomId]: Object.values(byEval) }));
  };

  const toggleSection = (nomId: string, section: "timeline" | "eval") => {
    const current = expanded[nomId];
    const next = current === section ? null : section;
    setExpanded((prev) => ({ ...prev, [nomId]: next }));
    if (next === "timeline") loadHistory(nomId);
    if (next === "eval") {
      if (useDynamic) loadDynamicEvals(nomId);
      else loadEvals(nomId);
    }
  };

  const doAdvance = async (id: string, stage: NominationStage, reason?: string, boardIds?: string[]) => {
    setAdvancing(id);
    const res = await advanceNominationStage(id, stage, reason, boardIds);
    setAdvancing(null);
    if (res.error) { toast.error(res.error); return; }
    setNominations((prev) => prev.map((n) => n.id === id
      ? { ...n, stage, board_member_ids: boardIds ?? n.board_member_ids } as NominationRow
      : n
    ));
    setHistories((prev) => {
      const existing = prev[id] ?? [];
      const nom = nominations.find((n) => n.id === id);
      return {
        ...prev,
        [id]: [...existing, {
          id: Math.random().toString(36),
          nomination_id: id,
          from_stage: nom?.stage ?? null,
          to_stage: stage,
          changed_by_display: `${profile.rank ? profile.rank + " " : ""}${profile.full_name}`,
          changed_at: new Date().toISOString(),
          reason: reason ?? null,
        }],
      };
    });
    toast.success("Stage updated");
    router.refresh();
  };

  const handleStageChange = (id: string, stage: NominationStage) => {
    if (!canApprove) return;
    if (stage === "not_selected") {
      const nom = nominations.find((n) => n.id === id);
      setRejectDialog({ id, billetName: nom?.billet_name ?? "" });
      setRejectReason("");
      return;
    }
    if (stage === "interviewed") {
      const nom = nominations.find((n) => n.id === id);
      setBoardDialog({ id, billetName: nom?.billet_name ?? "", current: nom?.board_member_ids ?? [] });
      setBoardSelected(nom?.board_member_ids ?? []);
      return;
    }
    doAdvance(id, stage);
  };

  const confirmReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    await doAdvance(rejectDialog.id, "not_selected", rejectReason);
    setRejectDialog(null);
    setRejectReason("");
  };

  const confirmBoard = async () => {
    if (!boardDialog) return;
    await doAdvance(boardDialog.id, "interviewed", undefined, boardSelected);
    setBoardDialog(null);
  };

  const handleSubmitEval = async (nomId: string) => {
    if (useDynamic) {
      const missingCategories = rubricCategories.filter((c) => !evalForm[c.id]);
      if (missingCategories.length > 0) {
        toast.error("Please rate all criteria before submitting.");
        return;
      }
      setSubmittingEval(true);
      const scores = rubricCategories.map((c) => ({ category_id: c.id, score: evalForm[c.id] ?? 0, comments: "" }));
      const res = await submitDynamicNominationEval(nomId, scores, evalComments);
      setSubmittingEval(false);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Evaluation submitted");
      setDynamicEvals((prev) => {
        const existing = (prev[nomId] ?? []).filter((e) => e.evaluator_id !== profile.id);
        return {
          ...prev,
          [nomId]: [...existing, {
            evaluator_id: profile.id,
            overall_comments: evalComments || null,
            submitted_at: new Date().toISOString(),
            scores: rubricCategories.map((c) => ({ category_id: c.id, category_name: c.name, score: evalForm[c.id] ?? 0 })),
          }],
        };
      });
    } else {
      const scores = Object.fromEntries(
        EVAL_CRITERIA.map((c) => [c.key, evalForm[c.key] ?? 0])
      ) as Record<string, number>;
      if (Object.values(scores).some((v) => v === 0)) {
        toast.error("Please rate all criteria before submitting.");
        return;
      }
      setSubmittingEval(true);
      const res = await submitNominationEval(nomId, scores as Parameters<typeof submitNominationEval>[1], evalComments);
      setSubmittingEval(false);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Evaluation submitted");
      setEvals((prev) => {
        const existing = (prev[nomId] ?? []).filter((e) => e.evaluator_id !== profile.id);
        return {
          ...prev,
          [nomId]: [...existing, {
            id: Math.random().toString(36),
            nomination_id: nomId,
            evaluator_id: profile.id,
            ...scores,
            comments: evalComments || null,
            submitted_at: new Date().toISOString(),
          } as NominationEval],
        };
      });
    }
    setEvalForm({});
    setEvalComments("");
  };

  const createNomination = async () => {
    if (!form.cadet_id || !form.billet_name) return;
    if (pipBlock) { toast.error("Cannot nominate: open PIP exists."); return; }
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("billet_nominations")
      .insert({
        cadet_id: form.cadet_id,
        billet_name: form.billet_name,
        billet_id: form.billet_id || null,
        notes: form.notes || null,
        nominated_by: profile.id,
        probation_end_date: form.probation_end_date || null,
      })
      .select("*, cadet:profiles!billet_nominations_cadet_id_fkey(full_name, rank), nominator:profiles!billet_nominations_nominated_by_fkey(full_name), approver:profiles!billet_nominations_approved_by_fkey(full_name)")
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setNominations((prev) => [data as unknown as NominationRow, ...prev]);
    setShowNew(false);
    setForm({ cadet_id: "", billet_name: "", billet_id: "", notes: "", probation_end_date: "" });
    setCadetQuals([]);
    toast.success("Nomination created");
  };

  const active = nominations.filter((n) => !["confirmed", "not_selected"].includes(n.stage));
  const completed = nominations.filter((n) => ["confirmed", "not_selected"].includes(n.stage));

  const NominationCard = ({ n }: { n: NominationRow }) => {
    const section = expanded[n.id] ?? null;
    const nomHistory = histories[n.id] ?? [];
    const nomEvals = evals[n.id] ?? [];
    const nomDynEvals = dynamicEvals[n.id] ?? [];
    const myEval = useDynamic
      ? nomDynEvals.find((e) => e.evaluator_id === profile.id)
      : nomEvals.find((e) => e.evaluator_id === profile.id);
    const evalCount = useDynamic ? nomDynEvals.length : nomEvals.length;
    const avgScore = useDynamic
      ? (nomDynEvals.length > 0
          ? (nomDynEvals.reduce((sum, e) => {
              const avg = e.scores.reduce((a, b) => a + b.score, 0) / (e.scores.length || 1);
              return sum + avg;
            }, 0) / nomDynEvals.length).toFixed(1)
          : null)
      : (nomEvals.length > 0
          ? (nomEvals.reduce((sum, e) => {
              const scores = EVAL_CRITERIA.map((c) => (e[c.key] as number | null) ?? 0);
              return sum + scores.reduce((a, b) => a + b, 0) / scores.length;
            }, 0) / nomEvals.length).toFixed(1)
          : null);

    return (
      <Card className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {n.cadet?.rank ? `${n.cadet.rank} ` : ""}{n.cadet?.full_name ?? "Unknown"}
          </p>
          <p className="text-xs text-gray-500">{n.billet_name}</p>
          {n.probation_end_date && (
            <p className="text-xs text-amber-600">Probation ends {format(new Date(n.probation_end_date), "MMM d")}</p>
          )}
          {n.notes && <p className="text-xs text-gray-400 italic">{n.notes}</p>}
          {n.board_member_ids && n.board_member_ids.length > 0 && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {n.board_member_ids.length} board member{n.board_member_ids.length !== 1 ? "s" : ""}
            </p>
          )}
          {avgScore && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              Avg {avgScore}/{useDynamic ? (rubricCategories[0]?.max_score ?? 5) : 5} ({evalCount} eval{evalCount !== 1 ? "s" : ""})
            </p>
          )}
        </div>

        {canApprove && (
          <Select
            value={n.stage}
            onValueChange={(v) => handleStageChange(n.id, v as NominationStage)}
            disabled={advancing === n.id}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>{NOMINATION_STAGE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Expandable sections */}
        {canApprove && (
          <div className="flex gap-2 pt-1 border-t">
            <button
              onClick={() => toggleSection(n.id, "timeline")}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Clock className="h-3 w-3" />
              History
              {section === "timeline" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <button
              onClick={() => toggleSection(n.id, "eval")}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Star className="h-3 w-3" />
              Evals {evalCount > 0 ? `(${evalCount})` : ""}
              {section === "eval" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        )}

        {/* Timeline */}
        {section === "timeline" && (
          <div className="pt-1 space-y-1.5">
            {nomHistory.length === 0 ? (
              <p className="text-xs text-gray-400">No stage history recorded yet.</p>
            ) : (
              nomHistory.map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#003087]" />
                  <div>
                    <span className="text-gray-700">
                      {h.from_stage ? `${NOMINATION_STAGE_LABELS[h.from_stage as NominationStage] ?? h.from_stage} → ` : ""}
                      <span className="font-medium">{NOMINATION_STAGE_LABELS[h.to_stage as NominationStage] ?? h.to_stage}</span>
                    </span>
                    <span className="text-gray-400 ml-1">
                      by {h.changed_by_display ?? "unknown"} · {format(parseISO(h.changed_at), "MMM d")}
                    </span>
                    {h.reason && <p className="text-gray-500 italic mt-0.5">{h.reason}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Evals */}
        {section === "eval" && (
          <div className="pt-1 space-y-3">
            {/* Dynamic evals */}
            {useDynamic && nomDynEvals.length > 0 && (
              <div className="space-y-2">
                {nomDynEvals.map((ev, i) => {
                  const avg = ev.scores.length > 0 ? ev.scores.reduce((s, sc) => s + sc.score, 0) / ev.scores.length : 0;
                  const maxScore = rubricCategories[0]?.max_score ?? 5;
                  return (
                    <div key={i} className="rounded-lg border bg-gray-50 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{ev.evaluator_id === profile.id ? "Your eval" : "Board member"}</span>
                        <span className="text-amber-600 flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {avg.toFixed(1)}/{maxScore}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {ev.scores.map((sc) => (
                          <span key={sc.category_id} className="text-gray-500">
                            {sc.category_name}: <span className="font-medium text-gray-700">{sc.score}</span>
                          </span>
                        ))}
                      </div>
                      {ev.overall_comments && <p className="text-gray-500 italic border-t pt-1">{ev.overall_comments}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Static evals (when no rubric categories configured) */}
            {!useDynamic && nomEvals.length > 0 && (
              <div className="space-y-2">
                {nomEvals.map((ev) => {
                  const avg = EVAL_CRITERIA.reduce((s, c) => s + ((ev[c.key] as number | null) ?? 0), 0) / EVAL_CRITERIA.length;
                  return (
                    <div key={ev.id} className="rounded-lg border bg-gray-50 p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{ev.evaluator_id === profile.id ? "Your eval" : "Evaluator"}</span>
                        <span className="text-amber-600 flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {avg.toFixed(1)}/5
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {EVAL_CRITERIA.map((c) => (
                          <span key={c.key} className="text-gray-500">
                            {c.label}: <span className="font-medium text-gray-700">{ev[c.key] ?? "—"}</span>
                          </span>
                        ))}
                      </div>
                      {ev.comments && <p className="text-gray-500 italic border-t pt-1">{ev.comments}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit/update my eval */}
            {canApprove && (
              <div className="space-y-2 border-t pt-2">
                <p className="text-xs font-semibold text-gray-600">{myEval ? "Update Your Eval" : "Submit Eval"}</p>
                {useDynamic ? (
                  rubricCategories.map((c) => {
                    const myDynEval = myEval as DynamicEval | undefined;
                    const existing = myDynEval?.scores.find((s) => s.category_id === c.id)?.score ?? 0;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <div className="w-32 shrink-0">
                          <span className="text-xs text-gray-600">{c.name}</span>
                          <span className="text-xs text-gray-400 block">/{c.max_score}</span>
                        </div>
                        <StarRating
                          value={evalForm[c.id] ?? existing}
                          onChange={(v) => setEvalForm((prev) => ({ ...prev, [c.id]: v }))}
                        />
                      </div>
                    );
                  })
                ) : (
                  EVAL_CRITERIA.map((c) => {
                    const myStaticEval = myEval as NominationEval | undefined;
                    return (
                      <div key={c.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-600 w-32 shrink-0">{c.label}</span>
                        <StarRating
                          value={evalForm[c.key] ?? myStaticEval?.[c.key] ?? 0}
                          onChange={(v) => setEvalForm((prev) => ({ ...prev, [c.key]: v }))}
                        />
                      </div>
                    );
                  })
                )}
                <Textarea
                  rows={2}
                  placeholder="Overall comments (optional)"
                  value={evalComments || ((myEval as NominationEval | undefined)?.comments ?? (myEval as DynamicEval | undefined)?.overall_comments ?? "")}
                  onChange={(e) => setEvalComments(e.target.value)}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => handleSubmitEval(n.id)}
                  disabled={submittingEval}
                  className="w-full bg-[#003087] hover:bg-[#002266] text-xs h-7"
                >
                  {submittingEval ? "Submitting…" : myEval ? "Update Eval" : "Submit Eval"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nominations & Promotions</h1>
          <p className="text-sm text-gray-500">{active.length} active pipeline{active.length !== 1 ? "s" : ""}</p>
        </div>
        {canApprove && (
          <Button onClick={() => setShowNew(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Nominate
          </Button>
        )}
      </div>

      {/* Pipeline */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["nominated", "applied", "interviewed", "approved_probation"] as NominationStage[]).map((stage) => {
          const inStage = active.filter((n) => n.stage === stage);
          return (
            <div key={stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className={NOMINATION_STAGE_COLORS[stage]}>{NOMINATION_STAGE_LABELS[stage]}</Badge>
                <span className="text-xs text-gray-400">{inStage.length}</span>
              </div>
              {inStage.map((n) => <NominationCard key={n.id} n={n} />)}
              {inStage.length === 0 && (
                <div className="rounded-lg border border-dashed p-3 text-center text-xs text-gray-400">Empty</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">Completed</h2>
          <div className="space-y-1">
            {completed.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{n.cadet?.full_name}</span>
                  <span className="text-gray-500"> → {n.billet_name}</span>
                </div>
                <Badge className={NOMINATION_STAGE_COLORS[n.stage]}>{NOMINATION_STAGE_LABELS[n.stage]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Not Selected — Reason Required</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This reason will be included in the notification sent to <strong>{rejectDialog?.billetName}</strong> applicant.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Brief reason (e.g. Needs more time in current role, position filled by senior cadet…)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              onClick={confirmReject}
              disabled={!rejectReason.trim() || advancing !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Not Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Board member dialog */}
      <Dialog open={!!boardDialog} onOpenChange={(o) => !o && setBoardDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Assign Board Members</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Only selected board members will receive notifications for this nomination. Leave empty to notify all command staff.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {commandStaff.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={boardSelected.includes(s.id)}
                    onCheckedChange={(checked) => {
                      setBoardSelected((prev) =>
                        checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      );
                    }}
                  />
                  <span className="text-sm text-gray-700">{s.rank ? `${s.rank} ` : ""}{s.full_name}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoardDialog(null)}>Cancel</Button>
            <Button onClick={confirmBoard} disabled={advancing !== null} className="bg-[#003087] hover:bg-[#002266]">
              Advance to Interviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New nomination dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Nomination</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cadet *</Label>
              <Select value={form.cadet_id} onValueChange={(v) => { setForm({ ...form, cadet_id: v ?? "" }); checkPip(v ?? ""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cadet…">
                    {form.cadet_id ? (() => { const c = cadets.find((x) => x.id === form.cadet_id); return c ? `${c.rank ? c.rank + " " : ""}${c.full_name}` : null; })() : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {pipBlock && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {pipBlock}
              </div>
            )}
            {form.cadet_id && cadetQuals.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qualifications</p>
                <div className="flex flex-wrap gap-1.5">
                  {cadetQuals.map((q) => (
                    <span key={q.qual_type} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${QUAL_STATUS_COLORS[q.status as keyof typeof QUAL_STATUS_COLORS] ?? "bg-gray-100 text-gray-600"}`}>
                      {q.qual_type}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {form.cadet_id && cadetQuals.length === 0 && (
              <p className="text-xs text-gray-400 italic">No qualifications on record for this cadet.</p>
            )}
            <div className="space-y-1.5">
              <Label>Billet *</Label>
              <Select value={form.billet_name} onValueChange={(v) => setForm({ ...form, billet_name: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select billet…" /></SelectTrigger>
                <SelectContent>
                  {(billets ?? []).map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Probation End Date</Label>
              <Input type="date" value={form.probation_end_date} onChange={(e) => setForm({ ...form, probation_end_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={createNomination}
              disabled={creating || !form.cadet_id || !form.billet_name || !!pipBlock}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {creating ? "Creating…" : "Create Nomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
