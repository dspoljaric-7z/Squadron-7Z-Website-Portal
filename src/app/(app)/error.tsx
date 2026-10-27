"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 bg-red-50">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-gray-500 max-w-xs">
          An unexpected error occurred. Try refreshing the page or contact your squadron officer if the issue persists.
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        Try again
      </Button>
    </div>
  );
}
