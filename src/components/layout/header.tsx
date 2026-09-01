import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { initials, roleLabel } from "@/lib/format";
import type { Profile } from "@/types/database";

const ROLE_DOT: Record<string, string> = {
  officer: "bg-[#B8860B]",
  snco: "bg-purple-400",
  nco: "bg-amber-400",
  cadet: "bg-blue-400",
  parent: "bg-gray-400",
};

export function Header({ profile, unitName }: { profile: Profile; unitName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[#003087]" />
        <p className="text-sm font-bold text-gray-800 sm:text-[15px]">{unitName}</p>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell profileId={profile.id} />
        <div className="hidden text-right sm:block">
          <p className="text-[13px] font-semibold leading-tight text-gray-800">{profile.full_name}</p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            {profile.rank && (
              <span className="text-[11px] font-bold text-[#B8860B]">{profile.rank}</span>
            )}
            <span className="text-[11px] font-medium text-gray-400">{roleLabel(profile.role)}</span>
          </div>
        </div>
        <div className="relative">
          <Avatar className="h-9 w-9 ring-2 ring-[#003087]/10">
            <AvatarFallback className="bg-[#003087] text-xs font-bold text-white">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${ROLE_DOT[profile.role] ?? "bg-gray-400"}`}
          />
        </div>
      </div>
    </header>
  );
}
