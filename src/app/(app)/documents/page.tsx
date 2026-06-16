import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentsClient } from "@/components/documents/documents-client";

export default async function DocumentsPage() {
  const profile = await requireProfile();
  if (profile.role === "parent") redirect("/dashboard");

  const supabase = await createClient();
  const { data: documents } = await supabase.from("documents").select("*").order("folder").order("name");

  return <DocumentsClient profile={profile} initialDocuments={documents ?? []} />;
}
