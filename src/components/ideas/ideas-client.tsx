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
import { Plus, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IDEA_CATEGORY_LABELS } from "@/lib/constants";
import { isOfficer } from "@/lib/permissions";
import type { Profile, ActivityIdea, IdeaCategory } from "@/types/database";

type IdeaRow = ActivityIdea & { submitter: { full_name: string } | null };

const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-700",
};

export function IdeasClient({ initialIdeas, profile }: { initialIdeas: IdeaRow[]; profile: Profile }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [showNew, setShowNew] = useState(false);
  const [ideaTab, setIdeaTab] = useState<IdeaCategory>("drill");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "drill" as IdeaCategory,
    title: "",
    description: "",
    duration_minutes: "",
    materials: "",
    difficulty: "" as "" | "easy" | "medium" | "hard",
  });

  const canEdit = isOfficer(profile);

  const createIdea = async () => {
    if (!form.title) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("activity_ideas")
      .insert({
        category: form.category,
        title: form.title,
        description: form.description || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        materials: form.materials || null,
        difficulty: form.difficulty || null,
        submitted_by: profile.id,
      })
      .select("*, submitter:profiles!activity_ideas_submitted_by_fkey(full_name)")
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setIdeas((prev) => [data as unknown as IdeaRow, ...prev]);
    setShowNew(false);
    setForm({ category: "drill", title: "", description: "", duration_minutes: "", materials: "", difficulty: "" });
    toast.success("Idea added");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this idea?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("activity_ideas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  };

  const forCategory = (cat: IdeaCategory) => ideas.filter((i) => i.category === cat);

  const IdeaCard = ({ idea }: { idea: IdeaRow }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{idea.title}</p>
            {idea.difficulty && (
              <Badge className={DIFFICULTY_COLORS[idea.difficulty]}>{idea.difficulty}</Badge>
            )}
          </div>
          {idea.description && <p className="text-sm text-gray-600">{idea.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {idea.duration_minutes && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{idea.duration_minutes} min</span>
            )}
            {idea.materials && <span>Materials: {idea.materials}</span>}
            {idea.submitter?.full_name && <span>by {idea.submitter.full_name}</span>}
          </div>
        </div>
        {canEdit && (
          <button onClick={() => remove(idea.id)} className="text-red-400 hover:text-red-600 shrink-0">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ideas Bank</h1>
          <p className="text-sm text-gray-500">{ideas.length} idea{ideas.length !== 1 ? "s" : ""} across all categories</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-[#003087] hover:bg-[#002266]" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Idea
        </Button>
      </div>

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {(["drill", "stem", "service"] as IdeaCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setIdeaTab(cat)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  ideaTab === cat
                    ? "border-[#003087] text-[#003087]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {IDEA_CATEGORY_LABELS[cat]} ({forCategory(cat).length})
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-3 space-y-3">
          {forCategory(ideaTab).length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              No {IDEA_CATEGORY_LABELS[ideaTab]} ideas yet. Add one above.
            </div>
          )}
          {forCategory(ideaTab).map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
        </div>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add Idea</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as IdeaCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(IDEA_CATEGORY_LABELS) as [IdeaCategory, string][]).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Activity name" />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} placeholder="e.g. 60" />
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={form.difficulty || "_none"} onValueChange={(v) => setForm({ ...form, difficulty: v === "_none" ? "" : v as "easy" | "medium" | "hard" })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="What does this involve?" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Materials / Equipment</Label>
                <Input value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} placeholder="What's needed to run this?" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createIdea} disabled={saving || !form.title} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : "Add Idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
