"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import type { Event, EventType } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";

function toLocalInput(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventDrawer({
  open,
  onOpenChange,
  event,
  onSaved,
  onDeleted,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: Event | null;
  onSaved: () => void;
  onDeleted: () => void;
  readOnly?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<EventType>("drill");
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setStartTime(toLocalInput(event.start_time));
      setEndTime(toLocalInput(event.end_time));
      setLocation(event.location ?? "");
      setEventType(event.event_type);
    } else {
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setEventType("drill");
    }
    setDirty(false);
  }, [event, open]);

  const requestClose = () => {
    if (dirty) setConfirmClose(true);
    else onOpenChange(false);
  };

  const handleSave = async () => {
    if (!title || !startTime) {
      toast.error("Title and start time are required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title,
      description: description || null,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      location: location || null,
      event_type: eventType,
    };

    let error;
    if (event) {
      ({ error } = await supabase.from("events").update(payload).eq("id", event.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
      ({ error } = await supabase.from("events").insert({ ...payload, created_by: profile?.id }));
    }
    setSaving(false);

    if (error) {
      toast.error("Failed to save event: " + error.message);
      return;
    }
    toast.success(event ? "Event updated" : "Event created");
    setDirty(false);
    onSaved();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!event) return;
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast.error("Failed to delete event");
      return;
    }
    toast.success("Event deleted");
    onDeleted();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(v) : requestClose())}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{readOnly ? "Event Details" : event ? "Edit Event" : "New Event"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} disabled={readOnly} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} disabled={readOnly} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="datetime-local" value={startTime} disabled={readOnly} onChange={(e) => { setStartTime(e.target.value); setDirty(true); }} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="datetime-local" value={endTime} disabled={readOnly} onChange={(e) => { setEndTime(e.target.value); setDirty(true); }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} disabled={readOnly} onChange={(e) => { setLocation(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={eventType} disabled={readOnly} onValueChange={(v) => { setEventType(v as EventType); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!readOnly && (
            <SheetFooter className="flex-row justify-between gap-2">
              {event && (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={requestClose}>Cancel</Button>
                <Button className="bg-[#003087] hover:bg-[#002266]" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved edits to this event.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmClose(false); setDirty(false); onOpenChange(false); }}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              {event && `"${event.title}" on ${format(new Date(event.start_time), "MMM d, yyyy")} will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { setConfirmDelete(false); handleDelete(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
