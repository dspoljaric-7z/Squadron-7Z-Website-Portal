import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GalleryClient } from "@/components/gallery/gallery-client";

export default async function GalleryPage() {
  const profile = await requireProfile();
  if (profile.role === "parent") redirect("/dashboard");

  const supabase = await createClient();
  const { data: albums } = await supabase.from("photo_albums").select("*").order("created_at", { ascending: false });

  return <GalleryClient profile={profile} initialAlbums={albums ?? []} />;
}
