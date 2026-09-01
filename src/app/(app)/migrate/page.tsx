import { requireProfile } from "@/lib/profile";
import { isCommand } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { MigrateClient } from "@/components/migrate/migrate-client";

export default async function MigratePage() {
  const profile = await requireProfile();
  if (!isCommand(profile)) redirect("/dashboard");

  return <MigrateClient />;
}
