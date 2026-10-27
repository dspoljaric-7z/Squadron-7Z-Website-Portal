"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_COLORS } from "@/lib/constants";
import type { Announcement, AnnouncementPriority, AnnouncementAudience, Profile } from "@/types/database";
import { Pencil, Plus, Trash2, Image as ImageIcon, CheckCheck } from "lucide-react";
import { HintButton } from "@/components/shared/hint-button";

const ANNOUNCEMENTS_HINTS = [
  { heading: "Posting an announcement", body: "Click 'New Announcement', write the title and body, choose the audience (All, Officers, Staff, Cadets, or Parents), set a priority (Low/Normal/High/Urgent), and Save." },
  { heading: "Audiences", body: "All = everyone who can log in. Staff = officers + SNCOs + NCOs. Choose carefully — cadets and parents see their respective feeds on the dashboard." },
  { heading: "From the Plan of Day", body: "On the SQ7Z POD page, staff can click 'Publish as Announcement' to auto-create an announcement from that day's plan. Useful for morning distribution." },
  { heading: "Editing & deleting", body: "Click the pencil icon to edit an existing announcement or the trash icon to delete it. Deletions are permanent." },
];
import { isStaff } from "@/lib/permissions";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AnnouncementWithAuthor = Announcement & {
  profiles: { full_name: string; rank: string | null } | null;
};

export function AnnouncementsClient({
  profile,
  initialAnnouncements,
  canPost,
  canDelete = false,
}: {
  profile: Profile;
  initialAnnouncements: AnnouncementWithAuthor[];
  canPost: boolean;
  canDelete?: boolean;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementWithAuthor | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const isStaffMember = isStaff(profile);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("profile_id", profile.id)
      .then(({ data }) => {
        if (data) {
          const existingIds = new Set(data.map((r: { announcement_id: string }) => r.announcement_id));
          setReadIds(existingIds);
          // Auto-mark all visible announcements as read on page visit
          const unread = initialAnnouncements
            .filter((a) => !existingIds.has(a.id))
            .map((a) => ({ announcement_id: a.id, profile_id: profile.id }));
          if (unread.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase.from("announcement_reads" as any).upsert(unread, { onConflict: "profile_id,announcement_id", ignoreDuplicates: true }).then(() => {
              setReadIds(new Set(initialAnnouncements.map((a) => a.id)));
            });
          }
        }
      });

    if (isStaffMember) {
      supabase
        .from("announcement_reads")
        .select("announcement_id")
        .then(({ data }) => {
          if (data) {
            const counts: Record<string, number> = {};
            for (const r of data) counts[r.announcement_id] = (counts[r.announcement_id] ?? 0) + 1;
            setReadCounts(counts);
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const acknowledge = async (announcementId: string) => {
    if (readIds.has(announcementId)) return;
    const supabase = createClient();
    const { error } = await supabase.from("announcement_reads").insert({
      announcement_id: announcementId,
      profile_id: profile.id,
    });
    if (error) { toast.error("Failed to acknowledge"); return; }
    setReadIds((prev) => { const next = new Set(prev); next.add(announcementId); return next; });
    setReadCounts((prev) => ({ ...prev, [announcementId]: (prev[announcementId] ?? 0) + 1 }));
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("announcements-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        supabase
          .from("announcements")
          .select("*, profiles:posted_by(full_name, rank)")
          .order("created_at", { ascending: false })
          .then(({ data }) => data && setAnnouncements(data as unknown as AnnouncementWithAuthor[]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementWithAuthor) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else toast.success("Announcement deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Announcements</h1>
          <LiveIndicator />
          <HintButton title="Announcements" hints={ANNOUNCEMENTS_HINTS} />
        </div>
        {canPost && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="bg-[#003087] hover:bg-[#002266]" onClick={openNew} />}>
              <Plus className="mr-1 h-4 w-4" /> New Announcement
            </DialogTrigger>
            <AnnouncementForm profile={profile} announcement={editing} onClose={() => setDialogOpen(false)} />
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {announcements.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
        {announcements.map((a) => {
          const needsAck = a.priority === "urgent" || a.priority === "important";
          const acked = readIds.has(a.id);
          const count = readCounts[a.id] ?? 0;
          return (
            <Card key={a.id} className={cn("p-4", a.priority === "urgent" && "border-red-300 bg-red-50")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.priority !== "general" && (
                      <Badge className={cn("capitalize", PRIORITY_COLORS[a.priority])}>{a.priority}</Badge>
                    )}
                    {a.audience && a.audience !== "all" && (
                      <Badge variant="outline" className="text-[10px] text-gray-500">
                        {{ officers_sncOs: "Officers & SNCOs", ncos_plus: "NCOs+", cadets_only: "Cadets" }[a.audience]}
                      </Badge>
                    )}
                    {isStaffMember && needsAck && (
                      <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                        <CheckCheck className="h-3 w-3" />
                        {count} acknowledged
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-gray-400">
                    {a.profiles?.full_name ?? "Staff"} &middot; {format(new Date(a.created_at), "MMM d, yyyy 'at' HH:mm")}
                    {a.updated_at !== a.created_at && " (edited)"}
                  </p>
                  {a.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="mb-2 max-h-64 rounded-md object-cover" />
                  )}
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: a.body }} />
                  {needsAck && !isStaffMember && (
                    <div className="mt-3">
                      {acked ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          <CheckCheck className="h-3.5 w-3.5" /> Acknowledged
                        </div>
                      ) : (
                        <button
                          onClick={() => acknowledge(a.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#003087] px-3 py-1 text-xs font-semibold text-white hover:bg-[#002266] transition-colors"
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Acknowledge
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {canPost && (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-[#003087]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementForm({
  profile,
  announcement,
  onClose,
}: {
  profile: Profile;
  announcement: AnnouncementWithAuthor | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(announcement?.priority ?? "general");
  const [audience, setAudience] = useState<AnnouncementAudience>(announcement?.audience ?? "all");
  const [imageUrl, setImageUrl] = useState(announcement?.image_url ?? "");
  const [expiresAt, setExpiresAt] = useState(announcement?.expires_at ? announcement.expires_at.split("T")[0] : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("announcements").upload(path, file);
    if (error) {
      toast.error("Image upload failed");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("announcements").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as any;
    const payload = { title, body, priority, audience, image_url: imageUrl || null, expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null };

    let error;
    if (announcement) {
      ({ error } = await sb.from("announcements").update(payload).eq("id", announcement.id));
    } else {
      ({ error } = await sb.from("announcements").insert({ ...payload, posted_by: profile.id }));
    }
    setSaving(false);
    if (error) {
      toast.error("Failed to save announcement");
      return;
    }
    toast.success(announcement ? "Announcement updated" : "Announcement posted");
    onClose();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{announcement ? "Edit Announcement" : "New Announcement"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Body</Label>
          <RichTextEditor value={body} onChange={setBody} placeholder="Write your announcement..." />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as AnnouncementPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Audience</Label>
          <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="officers_sncOs">Officers &amp; SNCOs only</SelectItem>
              <SelectItem value="ncos_plus">NCOs, SNCOs &amp; Officers</SelectItem>
              <SelectItem value="cadets_only">Cadets only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Expires on (optional — leave blank to never expire)</Label>
          <input
            type="date"
            value={expiresAt}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]/30"
          />
        </div>
        <div className="space-y-2">
          <Label>Image (optional)</Label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
            <ImageIcon className="h-4 w-4" />
            {uploading ? "Uploading..." : imageUrl ? "Change image" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </label>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="max-h-32 rounded-md object-cover" />
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-[#003087] hover:bg-[#002266]" onClick={handleSave} disabled={saving || uploading}>
          {saving ? "Saving..." : announcement ? "Save Changes" : "Post Announcement"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
