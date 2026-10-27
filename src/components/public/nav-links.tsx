"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Programs", href: "/programs" },
  { label: "Trainings", href: "/trainings" },
  { label: "Leadership", href: "/leadership" },
  { label: "Alumni", href: "/alumni" },
  { label: "For Parents", href: "/parents" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-7 md:flex">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              active
                ? "border-b border-[#B8860B] pb-0.5 font-bold text-white"
                : "text-white/55 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
