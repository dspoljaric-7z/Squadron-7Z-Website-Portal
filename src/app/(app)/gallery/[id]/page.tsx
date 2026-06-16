import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AlbumClient } from "@/components/gallery/album-client";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  if (profile.role === "parent") redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: album }, { data: photos }] = await Promise.all([
    supabase.from("photo_albums").select("*").eq("id", id).single(),
    supabase.from("photos").select("*").eq("album_id", id).order("created_at", { ascending: false }),
  ]);

  if (!album) notFound();

  return <AlbumClient profile={profile} album={album} initialPhotos={photos ?? []} />;
}
