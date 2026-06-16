"use client";

import { useEffect } from "react";
import { Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-500 bg-white">
        <Anchor className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-[#003087]">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        An unexpected error occurred. Please try again, and contact a Squadron Officer if the problem persists.
      </p>
      <Button className="mt-6 bg-[#003087] hover:bg-[#002266]" onClick={reset}>Try Again</Button>
    </main>
  );
}
