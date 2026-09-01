"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ISSUE_CATEGORY_LABELS } from "@/lib/constants";
import type { Profile, OtherIssue, IssueCategory, IssueStatus } from "@/types/database";

type IssueRow = OtherIssue & {
  cadet: { full_name: string; rank: string | null } | null;
  reporter: { full_name: string } | null;
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: "bg-red-100 text-red-700",
  monitoring: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-700",
};

export function OtherIssuesClient({
  initialIssues,
  cadets,
  profile,
}: {
  initialIssues: IssueRow[];
  cadets: { id: string; full_name: string; rank: string | null }[];
  profile: Profile;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cadet_id: "",
    category: "general" as IssueCategory,
    title: "",
    description: "",
  });

  const createIssue = async () => {
    if (!form.title) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("other_issues")
      .insert({
        cadet_id: form.cadet_id || null,
        category: form.category,
        title: form.title,
        description: form.description || null,
        reported_by: profile.id,
        status: "open",
      })
      .select("*, cadet:profiles!other_issues_cadet_id_fkey(full_name, rank), reporter:profiles!other_issues_reported_by_fkey(full_name)")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setIssues((prev) => [data as unknown as IssueRow, ...prev]);
    setShowNew(false);
    setForm({ cadet_id: "", category: "general", title: "", description: "" });
    toast.success("Issue logged");
  };

  const updateStatus = async (id: string, status: IssueStatus, notes?: string) => {
    const supabase = createClient();
    await supabase.from("other_issues").update({ status, resolution_notes: notes || null, updated_at: new Date().toISOString() }).eq("id", id);
    setIssues((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    toast.success("Status updated");
  };

  const open = issues.filter((i) => i.status !== "resolved");
  const resolved = issues.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl font-bold text-gray-900">Other Issues</h1>
            <Badge className="bg-red-100 text-red-700 border-red-200">Command Only</Badge>
          </div>
          <p className="text-sm text-gray-500">{open.length} active · {resolved.length} resolved</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Log Issue
        </Button>
      </div>

      <div className="space-y-3">
        {open.map((issue) => (
          <IssueCard key={issue.id} issue={issue} onStatusChange={updateStatus} />
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Resolved</h2>
          <div className="space-y-2">
            {resolved.slice(0, 10).map((issue) => (
              <div key={issue.id} className="flex items-center justify-between rounded border bg-gray-50 px-4 py-2 text-sm text-gray-500">
                <span>{issue.title} {issue.cadet?.full_name ? `· ${issue.cadet.full_name}` : ""}</span>
                <span className="text-xs">{format(new Date(issue.created_at), "MMM d, yyyy")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Issue</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as IssueCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ISSUE_CATEGORY_LABELS) as [IssueCategory, string][]).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Related Cadet (optional)</Label>
              <Select value={form.cadet_id || "_none"} onValueChange={(v) => setForm({ ...form, cadet_id: !v || v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Unit-wide (no specific cadet)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Unit-wide</SelectItem>
                  {cadets.map((c) => <SelectItem key={c.id} value={c.id}>{c.rank ? `${c.rank} ` : ""}{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief summary" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Details, context, action taken…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createIssue} disabled={saving || !form.title} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : "Log Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IssueCard({ issue, onStatusChange }: { issue: IssueRow; onStatusChange: (id: string, status: IssueStatus, notes?: string) => void }) {
  const [resNotes, setResNotes] = useState("");
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_COLORS[issue.status]}>{issue.status}</Badge>
            <Badge variant="outline" className="text-xs">{ISSUE_CATEGORY_LABELS[issue.category]}</Badge>
          </div>
          <p className="mt-1.5 font-semibold text-gray-900">{issue.title}</p>
          {issue.cadet?.full_name && (
            <p className="text-sm text-gray-500">Re: {issue.cadet.rank ? `${issue.cadet.rank} ` : ""}{issue.cadet.full_name}</p>
          )}
          {issue.description && <p className="mt-1 text-sm text-gray-600">{issue.description}</p>}
          <p className="mt-1 text-xs text-gray-400">
            Logged by {issue.reporter?.full_name ?? "Unknown"} · {format(new Date(issue.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      {issue.status !== "resolved" && (
        <div className="flex gap-2 pt-1">
          {issue.status === "open" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(issue.id, "monitoring")}>
              Mark Monitoring
            </Button>
          )}
          <Input value={resNotes} onChange={(e) => setResNotes(e.target.value)} placeholder="Resolution notes…" className="h-7 text-xs" />
          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onStatusChange(issue.id, "resolved", resNotes)}>
            Resolve
          </Button>
        </div>
      )}
    </Card>
  );
}
