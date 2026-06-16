"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
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
} from "@/components/ui/dialog";
import { ArrowLeft, Upload, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import type { Photo, PhotoAlbum, Profile } from "@/types/database";

export function AlbumClient({ profile, album, initialPhotos }: { profile: Profile; album: PhotoAlbum; initialPhotos: Photo[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [editAlbumOpen, setEditAlbumOpen] = useState(false);
  const [albumMeta, setAlbumMeta] = useState(album);
  const isOfficer = profile.role === "officer" || profile.role === "snco";

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`album-${album.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `album_id=eq.${album.id}` }, () => {
        supabase.from("photos").select("*").eq("album_id", album.id).order("created_at", { ascending: false }).then(({ data }) => data && setPhotos(data));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "photo_albums", filter: `id=eq.${album.id}` }, (payload) => {
        setAlbumMeta(payload.new as PhotoAlbum);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [album.id]);

  const handleUpload = async (file: File) => {
    const supabase = createClient();
    const path = `${album.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("photos").upload(path, file);
    if (uploadError) {
      toast.error("Upload failed");
      return;
    }
    const { data } = supabase.storage.from("photos").getPublicUrl(path);
    const { error } = await supabase.from("photos").insert({ album_id: album.id, url: data.publicUrl, uploaded_by: profile.id });
    if (error) {
      toast.error("Failed to save photo");
      return;
    }
    if (!album.cover_url) {
      await supabase.from("photo_albums").update({ cover_url: data.publicUrl }).eq("id", album.id);
    }
    toast.success("Photo uploaded");
  };

  const saveAlbumMeta = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("photo_albums").update({ name: albumMeta.name, description: albumMeta.description }).eq("id", album.id);
    if (error) {
      toast.error("Failed to update album");
      return;
    }
    toast.success("Album updated");
    setEditAlbumOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/gallery" className="text-gray-400 hover:text-[#003087]"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-[#003087]">{albumMeta.name}</h1>
            {albumMeta.description && <p className="text-sm text-gray-500">{albumMeta.description}</p>}
          </div>
          <LiveIndicator />
        </div>
        {isOfficer && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditAlbumOpen(true)}><Pencil className="mr-1 h-4 w-4" /> Edit Album</Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#003087] px-4 py-2 text-sm font-medium text-white hover:bg-[#002266]">
              <Upload className="h-4 w-4" /> Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <button key={photo.id} onClick={() => setLightbox(photo)} className="aspect-square overflow-hidden rounded-md bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.caption ?? ""} className="h-full w-full object-cover transition hover:scale-105" />
          </button>
        ))}
        {photos.length === 0 && <p className="text-sm text-gray-400">No photos in this album yet.</p>}
      </div>

      {lightbox && (
        <Lightbox photo={lightbox} isOfficer={isOfficer} onClose={() => setLightbox(null)} onUpdated={(p) => {
          setPhotos((prev) => prev.map((ph) => (ph.id === p.id ? p : ph)));
          setLightbox(p);
        }} />
      )}

      <Dialog open={editAlbumOpen} onOpenChange={setEditAlbumOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Album</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={albumMeta.name} onChange={(e) => setAlbumMeta({ ...albumMeta, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={albumMeta.description ?? ""} onChange={(e) => setAlbumMeta({ ...albumMeta, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAlbumOpen(false)}>Cancel</Button>
            <Button className="bg-[#003087] hover:bg-[#002266]" onClick={saveAlbumMeta}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Lightbox({ photo, isOfficer, onClose, onUpdated }: { photo: Photo; isOfficer: boolean; onClose: () => void; onUpdated: (p: Photo) => void }) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [editing, setEditing] = useState(false);

  const saveCaption = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("photos").update({ caption }).eq("id", photo.id);
    if (error) {
      toast.error("Failed to update caption");
      return;
    }
    onUpdated({ ...photo, caption });
    setEditing(false);
    toast.success("Caption updated");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.caption ?? ""} className="max-h-[80vh] rounded-md object-contain" />
          <button onClick={onClose} className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 rounded-md bg-white p-3">
          {editing ? (
            <div className="flex gap-2">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." />
              <Button size="sm" className="bg-[#003087] hover:bg-[#002266]" onClick={saveCaption}>Save</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-700">{photo.caption || "No caption"}</p>
              {isOfficer && (
                <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-[#003087]">
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
