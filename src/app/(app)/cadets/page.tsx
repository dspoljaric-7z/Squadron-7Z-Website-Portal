import { requireProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/profile";
import { byLastName } from "@/lib/format";

export default async function CadetsPage() {
  const profile = await requireProfile();
  if (profile.role !== "officer" && profile.role !== "snco" && !profile.is_yeoman && !profile.is_lcpo) redirect("/dashboard");

  const supabase = await createClient();
  const { data: cadets } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#003087]">Cadets &amp; Members</h1>
      <Card className="divide-y">
        {(cadets ?? []).sort(byLastName).map((c) => (
          <Link key={c.id} href={`/cadets/${c.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-[#003087] text-xs text-white">{initials(c.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{c.full_name}</p>
                <p className="text-xs text-gray-400">
                  {c.rank ?? "—"}{c.billet ? ` · ${c.billet}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{c.role}</Badge>
              {!c.approved && <Badge variant="destructive">Pending</Badge>}
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
