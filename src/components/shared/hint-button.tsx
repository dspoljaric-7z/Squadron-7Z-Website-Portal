"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type HintSection = {
  heading?: string;
  body: string;
};

interface HintButtonProps {
  title: string;
  hints: HintSection[];
  className?: string;
}

export function HintButton({ title, hints, className }: HintButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ${className ?? ""}`}
        title="Show help"
        type="button"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Help</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {hints.map((hint, i) => (
              <div key={i}>
                {hint.heading && (
                  <p className="font-semibold text-sm mb-1">{hint.heading}</p>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{hint.body}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
