"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
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
import { Plus, Images } from "lucide-react";
import { toast } from "sonner";
import type { PhotoAlbum, Profile } from "@/types/database";

export function GalleryClient({ profile, initialAlbums }: { profile: Profile; initialAlbums: PhotoAlbum[] }) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [open, setOpen] = useState(false);
  const isOfficer = profile.role === "officer";

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("albums-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "photo_albums" }, () => {
        supabase.from("photo_albums").select("*").order("created_at", { ascending: false }).then(({ data }) => data && setAlbums(data));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Photo Gallery</h1>
          <LiveIndicator />
        </div>
        {isOfficer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-[#003087] hover:bg-[#002266]" />}>
              <Plus className="mr-1 h-4 w-4" /> New Album
            </DialogTrigger>
            <CreateAlbumForm profile={profile} onClose={() => setOpen(false)} />
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {albums.map((album) => (
          <Link key={album.id} href={`/gallery/${album.id}`}>
            <Card className="overflow-hidden">
              <div className="flex aspect-square items-center justify-center bg-gray-100">
                {album.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.cover_url} alt={album.name} className="h-full w-full object-cover" />
                ) : (
                  <Images className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium">{album.name}</p>
                {album.description && <p className="truncate text-xs text-gray-400">{album.description}</p>}
              </div>
            </Card>
          </Link>
        ))}
        {albums.length === 0 && <p className="text-sm text-gray-400">No albums yet.</p>}
      </div>
    </div>
  );
}

function CreateAlbumForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Album name is required.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("photo_albums").insert({
      name, description: description || null, created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to create album");
      return;
    }
    toast.success("Album created");
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader><DialogTitle>New Album</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-[#003087] hover:bg-[#002266]" onClick={handleCreate} disabled={saving}>
          {saving ? "Creating..." : "Create Album"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
