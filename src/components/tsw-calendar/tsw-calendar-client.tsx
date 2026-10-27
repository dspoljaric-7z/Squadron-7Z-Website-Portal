"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { isOfficer } from "@/lib/permissions";
import type { Profile, TswCalendarEntry } from "@/types/database";

const EMPTY = { date: "", title: "", location: "", plan: "", notes: "" };

export function TswCalendarClient({ initialEntries, profile }: { initialEntries: TswCalendarEntry[]; profile: Profile }) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TswCalendarEntry | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const canEdit = isOfficer(profile);
  const today = new Date().toISOString().split("T")[0];

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (entry: TswCalendarEntry) => {
    setEditing(entry);
    setForm({ date: entry.date, title: entry.title, location: entry.location ?? "", plan: entry.plan ?? "", notes: entry.notes ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.date || !form.title) return;
    setSaving(true);
    const supabase = createClient();

    if (editing) {
      const { error } = await supabase.from("tsw_calendar").update({ ...form, location: form.location || null, plan: form.plan || null, notes: form.notes || null, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      setEntries((prev) => prev.map((e) => e.id === editing.id ? { ...e, ...form } : e));
      toast.success("Entry updated");
    } else {
      const { data, error } = await supabase.from("tsw_calendar").insert({ ...form, location: form.location || null, plan: form.plan || null, notes: form.notes || null, created_by: profile.id }).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setEntries((prev) => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success("Entry added");
    }

    setSaving(false);
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("tsw_calendar").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Deleted");
  };

  const upcoming = entries.filter((e) => e.date >= today);
  const past = entries.filter((e) => e.date < today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">TSW Calendar</h1>
          <p className="text-sm text-gray-500">Training Ship Wasp / higher-echelon events</p>
        </div>
        {canEdit && (
          <Button onClick={openNew} className="bg-[#003087] hover:bg-[#002266]" size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Add Event
          </Button>
        )}
      </div>

      {entries.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">No TSW events yet.</p>
        </Card>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="shrink-0 rounded-lg border bg-[#003087] px-3 py-1 text-center">
                      <div className="text-xs font-semibold uppercase text-white/70">{format(parseISO(e.date), "MMM")}</div>
                      <div className="text-xl font-bold text-white leading-none">{format(parseISO(e.date), "d")}</div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{e.title}</p>
                      {e.location && <p className="text-sm text-gray-500">{e.location}</p>}
                      {e.plan && <p className="mt-1 text-sm text-gray-600">{e.plan}</p>}
                      {e.notes && <p className="mt-1 text-xs text-gray-400 italic">{e.notes}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Past Events</h2>
          <div className="space-y-1">
            {past.slice(-10).reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-2 text-sm text-gray-500">
                <span>{format(parseISO(e.date), "MMM d, yyyy")} · {e.title}{e.location ? ` · ${e.location}` : ""}</span>
                {canEdit && (
                  <button onClick={() => remove(e.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "New TSW Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event name" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Plan / Notes</Label>
                <Textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.date || !form.title} className="bg-[#003087] hover:bg-[#002266]">
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
