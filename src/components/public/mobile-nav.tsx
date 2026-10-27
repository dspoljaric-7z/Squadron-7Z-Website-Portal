"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Programs", href: "/programs" },
  { label: "Trainings", href: "/trainings" },
  { label: "Leadership", href: "/leadership" },
  { label: "Alumni", href: "/alumni" },
  { label: "For Parents", href: "/parents" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-xl p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-[#000d24]/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-[#001233] shadow-2xl transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8860B]">Navigation</p>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center rounded-xl p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-white/5 ${
                    active ? "bg-white/5 font-bold text-white" : "text-white/65 hover:text-white"
                  }`}
                >
                  {link.label}
                  <ChevronRight className={`h-4 w-4 ${active ? "text-[#B8860B]" : "text-white/20"}`} />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* CTA */}
        <div className="border-t border-white/8 p-4 space-y-2">
          <Link
            href="/join"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-full bg-[#B8860B] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#B8860B]/20 transition-all hover:bg-[#9a7009]"
          >
            Join Now
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cadet Portal
          </Link>
        </div>
      </div>
    </>
  );
}
