"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ATTENDANCE_COLORS } from "@/lib/constants";
import { initials, roleLabel, computedTrainingPhase, allBillets } from "@/lib/format";
import type { Attendance, Profile, StaffNote, BoardResultRow, UniformInspectionResult, UniformInspectionSession } from "@/types/database";
import { Pencil, Trophy, Shirt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type AttendanceWithEvent = Attendance & { events: { title: string; start_time: string } | null };
type StaffNoteWithAuthor = StaffNote & { profiles: { full_name: string; rank: string | null } | null };
type InspectionResultWithSession = UniformInspectionResult & { uniform_inspection_sessions: Pick<UniformInspectionSession, "date" | "notes"> | null };

const BOARD_RESULT_COLORS: Record<string, string> = {
  recommended: "bg-green-100 text-green-800 border-green-300",
  not_recommended: "bg-red-100 text-red-800 border-red-300",
  deferred: "bg-amber-100 text-amber-800 border-amber-300",
};
const BOARD_RESULT_LABELS: Record<string, string> = {
  recommended: "Recommended",
  not_recommended: "Not Recommended",
  deferred: "Deferred",
};

export function CadetProfileView({
  viewer,
  cadet,
  initialAttendance,
  initialNotes,
  initialBoardResults = [],
  initialInspectionResults = [],
}: {
  viewer: Profile;
  cadet: Profile;
  initialAttendance: AttendanceWithEvent[];
  initialNotes: StaffNoteWithAuthor[];
  initialBoardResults?: BoardResultRow[];
  initialInspectionResults?: InspectionResultWithSession[];
}) {
  const isOwner = viewer.id === cadet.id;
  const isStaff = viewer.role === "officer" || viewer.role === "snco" || viewer.role === "nco";
  const canEditBio = isOwner || isStaff;

  const [bio, setBio] = useState(cadet.bio ?? "");
  const [bioStatus, setBioStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [attendance, setAttendance] = useState(initialAttendance);
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const boardResults = initialBoardResults;
  const inspectionResults = initialInspectionResults;
  const [editOpen, setEditOpen] = useState(false);
  const [rank, setRank] = useState(cadet.rank ?? "");
  const [billet, setBillet] = useState(cadet.billet ?? "");
  const [billet2, setBillet2] = useState(cadet.billet_2 ?? "");
  const [billet3, setBillet3] = useState(cadet.billet_3 ?? "");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`profile-${cadet.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `cadet_id=eq.${cadet.id}` }, () => {
        supabase
          .from("attendance")
          .select("*, events(title, start_time)")
          .eq("cadet_id", cadet.id)
          .order("recorded_at", { ascending: false })
          .then(({ data }) => data && setAttendance(data as unknown as AttendanceWithEvent[]));
      });

    if (isStaff) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "staff_notes", filter: `cadet_id=eq.${cadet.id}` }, () => {
        supabase
          .from("staff_notes")
          .select("*, profiles:posted_by(full_name, rank)")
          .eq("cadet_id", cadet.id)
          .order("created_at", { ascending: false })
          .then(({ data }) => data && setNotes(data as unknown as StaffNoteWithAuthor[]));
      });
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cadet.id, isStaff]);

  const saveBio = async () => {
    if (bio === (cadet.bio ?? "")) return;
    setBioStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ bio }).eq("id", cadet.id);
    if (error) {
      toast.error("Failed to save bio");
      setBioStatus("idle");
      return;
    }
    setBioStatus("saved");
    setTimeout(() => setBioStatus("idle"), 2000);
  };

  const saveRankBillet = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ rank, billet, billet_2: billet2 || null, billet_3: billet3 || null }).eq("id", cadet.id);
    if (error) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Profile updated");
    setEditOpen(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("staff_notes").insert({
      cadet_id: cadet.id,
      note_body: newNote.trim(),
      posted_by: viewer.id,
    });
    if (error) {
      toast.error("Failed to add note");
      return;
    }
    toast.success("Note added");
    setNewNote("");
  };

  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900">{isOwner ? "My Profile" : `${roleLabel(cadet.role)} Profile`}</h1>
        <LiveIndicator />
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#003087] text-lg text-white">{initials(cadet.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{cadet.full_name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {cadet.rank && <Badge className="bg-[#B8860B] text-white">{cadet.rank}</Badge>}
                {allBillets(cadet).map((b) => (
                  <Badge key={b} variant="outline">{b}</Badge>
                ))}
                <Badge variant="outline" className="capitalize">{roleLabel(cadet.role)}</Badge>
              </div>
              {cadet.join_date && (
                <p className="mt-1 text-xs text-gray-400">Joined {format(new Date(cadet.join_date), "MMM d, yyyy")}</p>
              )}
              {cadet.date_of_rank && (
                <p className="mt-0.5 text-xs text-gray-400">Date of Rate: {format(new Date(cadet.date_of_rank), "MMM d, yyyy")}</p>
              )}
              {computedTrainingPhase(cadet.rank ?? null) && (
                <p className="mt-0.5 text-xs font-medium text-[#003087]/70">{computedTrainingPhase(cadet.rank ?? null)}</p>
              )}
            </div>
          </div>
          {isStaff && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader><DialogTitle>Edit Cadet Profile</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rate / Rank</Label>
                    <Input value={rank} onChange={(e) => setRank(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Billet</Label>
                    <Input value={billet} onChange={(e) => setBillet(e.target.value)} placeholder="e.g. Section Commander" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Billet</Label>
                    <Input value={billet2} onChange={(e) => setBillet2(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tertiary Billet</Label>
                    <Input value={billet3} onChange={(e) => setBillet3(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button className="bg-[#003087] hover:bg-[#002266]" onClick={saveRankBillet}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Bio</h3>
          {bioStatus === "saving" && <span className="text-xs text-gray-400">Saving...</span>}
          {bioStatus === "saved" && <span className="text-xs text-green-600">Saved ✓</span>}
        </div>
        {canEditBio ? (
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={saveBio}
            placeholder="Write a short bio..."
            rows={3}
          />
        ) : (
          <p className="text-sm text-gray-600">{cadet.bio || "No bio yet."}</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Attendance Summary</h3>
        <div className="mb-3 flex items-center gap-4">
          <div className="text-3xl font-bold text-[#003087]">{pct}%</div>
          <p className="text-sm text-gray-500">{present} of {total} events attended</p>
        </div>
        <div className="space-y-1">
          {(showAllAttendance ? attendance : attendance.slice(0, 8)).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.events?.title ?? "Event"} &middot; {a.events ? format(new Date(a.events.start_time), "MMM d, yyyy") : ""}</span>
              <Badge className={ATTENDANCE_COLORS[a.status]} variant="outline">{a.status}</Badge>
            </div>
          ))}
          {attendance.length === 0 && <p className="text-sm text-gray-400">No attendance records yet.</p>}
          {attendance.length > 8 && (
            <button
              onClick={() => setShowAllAttendance((v) => !v)}
              className="mt-1 text-xs font-medium text-[#003087] hover:underline"
            >
              {showAllAttendance ? "Show less" : `Show all ${attendance.length} records`}
            </button>
          )}
        </div>
      </Card>

      {boardResults.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#B8860B]" />
            <h3 className="font-semibold">Promotion Board History</h3>
          </div>
          <div className="space-y-2">
            {boardResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{format(new Date(r.board_date), "MMM d, yyyy")}</span>
                  {r.from_rank && r.to_rank && (
                    <span className="ml-2 text-gray-500">{r.from_rank} → {r.to_rank}</span>
                  )}
                  {r.notes && <p className="mt-0.5 text-xs text-gray-400">{r.notes}</p>}
                </div>
                <Badge variant="outline" className={BOARD_RESULT_COLORS[r.result]}>
                  {BOARD_RESULT_LABELS[r.result]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(isStaff || isOwner) && inspectionResults.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shirt className="h-4 w-4 text-[#003087]" />
            <h3 className="font-semibold">Uniform Inspection History</h3>
          </div>
          <div className="space-y-2">
            {inspectionResults.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">
                    {r.uniform_inspection_sessions ? format(new Date(r.uniform_inspection_sessions.date), "MMM d, yyyy") : "—"}
                  </span>
                  {r.deficiencies && <p className="mt-0.5 text-xs text-gray-500">{r.deficiencies}</p>}
                </div>
                <Badge variant="outline" className={r.passed ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}>
                  {r.passed ? "Pass" : "Fail"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Staff Notes
              <LiveIndicator />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note about this cadet..." rows={2} />
              <Button className="bg-[#003087] hover:bg-[#002266]" onClick={addNote}>Post</Button>
            </div>
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="rounded-md border bg-gray-50 p-2 text-sm">
                  <p>{n.note_body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {n.profiles?.full_name ?? "Staff"} &middot; {format(new Date(n.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-gray-400">No staff notes yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
