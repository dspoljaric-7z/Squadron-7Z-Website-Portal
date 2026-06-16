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
import type { Announcement, AnnouncementPriority, Profile } from "@/types/database";
import { Pencil, Plus, Trash2, Image as ImageIcon } from "lucide-react";
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
        {announcements.map((a) => (
          <Card key={a.id} className={cn("p-4", a.priority === "urgent" && "border-red-300 bg-red-50")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.priority !== "general" && (
                    <Badge className={cn("capitalize", PRIORITY_COLORS[a.priority])}>{a.priority}</Badge>
                  )}
                </div>
                <p className="mb-2 text-xs text-gray-400">
                  {a.profiles?.full_name ?? "Staff"} &middot; {format(new Date(a.created_at), "MMM d, yyyy 'at' h:mm a")}
                  {a.updated_at !== a.created_at && " (edited)"}
                </p>
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="mb-2 max-h-64 rounded-md object-cover" />
                )}
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: a.body }} />
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
        ))}
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
  const [imageUrl, setImageUrl] = useState(announcement?.image_url ?? "");
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
    const supabase = createClient();
    const payload = { title, body, priority, image_url: imageUrl || null };

    let error;
    if (announcement) {
      ({ error } = await supabase.from("announcements").update(payload).eq("id", announcement.id));
    } else {
      ({ error } = await supabase.from("announcements").insert({ ...payload, posted_by: profile.id }));
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
