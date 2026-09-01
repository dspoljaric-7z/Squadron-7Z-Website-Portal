"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ClipboardCheck, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { isSeniorStaff } from "@/lib/permissions";
import type { Profile, DrillSession } from "@/types/database";

type SessionWithNames = DrillSession & {
  maa: { full_name: string } | null;
  recorder: { full_name: string } | null;
};

export function DrillSessionList({
  initialSessions,
  officers,
  profile,
}: {
  initialSessions: SessionWithNames[];
  officers: { id: string; full_name: string; rank: string | null }[];
  profile: Profile;
}) {
  const router = useRouter();
  const sessions = initialSessions;
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "",
    uniform_of_day: "",
    maa_id: "",
  });

  const canCreate = isSeniorStaff(profile);

  const createSession = async () => {
    if (!form.date) return;
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("drill_sessions")
      .insert({
        date: form.date,
        location: form.location || null,
        uniform_of_day: form.uniform_of_day || null,
        maa_id: form.maa_id || null,
        recorded_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message.includes("unique") ? "A session already exists for that date." : error.message);
      setCreating(false);
      return;
    }

    toast.success("Drill session created");
    router.push(`/drill/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Drill Roll Call</h1>
          <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? "s" : ""} on record</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowNew(!showNew)}
            className="bg-[#003087] hover:bg-[#002266]"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Session
          </Button>
        )}
      </div>

      {showNew && (
        <Card className="p-4">
          <h2 className="mb-4 font-semibold text-gray-900">New Drill Session</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="e.g. Armory, Building 7" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Uniform of the Day</Label>
              <Input placeholder="e.g. Navy Blue Working Uniform" value={form.uniform_of_day} onChange={(e) => setForm({ ...form, uniform_of_day: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>MAA / Watch-Stander</Label>
              <Select value={form.maa_id} onValueChange={(v) => setForm({ ...form, maa_id: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select officer…" /></SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name}{o.rank ? ` — ${o.rank}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={createSession} disabled={creating || !form.date} className="bg-[#003087] hover:bg-[#002266]">
              {creating ? "Creating…" : "Create & Open Roll Call"}
            </Button>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {sessions.length === 0 && (
          <Card className="p-8 text-center">
            <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-gray-500">No drill sessions yet.</p>
            {canCreate && <p className="mt-1 text-sm text-gray-400">Create the first one above.</p>}
          </Card>
        )}

        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => router.push(`/drill/${s.id}`)}
            className="w-full text-left"
          >
            <Card className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#003087]/10">
                  {s.locked ? (
                    <Lock className="h-5 w-5 text-[#003087]" />
                  ) : (
                    <ClipboardCheck className="h-5 w-5 text-[#003087]" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(s.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.location ?? "Location TBD"}
                    {s.maa?.full_name ? ` · MAA: ${s.maa.full_name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.locked && <Badge variant="outline" className="text-xs">Locked</Badge>}
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
