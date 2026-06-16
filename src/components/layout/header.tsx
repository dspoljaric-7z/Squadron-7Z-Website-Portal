import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, roleLabel } from "@/lib/format";
import type { Profile } from "@/types/database";

export function Header({ profile, unitName }: { profile: Profile; unitName: string }) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
      <div>
        <p className="text-sm font-semibold text-[#003087] sm:text-base">{unitName}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{profile.full_name}</p>
          <div className="flex items-center justify-end gap-1.5">
            {profile.rank && (
              <span className="text-xs font-semibold text-[#B8860B]">{profile.rank}</span>
            )}
            <Badge variant="outline" className="text-xs">
              {roleLabel(profile.role)}
            </Badge>
          </div>
        </div>
        <Avatar>
          <AvatarFallback className="bg-[#003087] text-white">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
