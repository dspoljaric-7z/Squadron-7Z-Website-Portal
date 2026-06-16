import Link from "next/link";
import { Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#003087] bg-white">
        <Anchor className="h-7 w-7 text-[#003087]" />
      </div>
      <h1 className="mt-4 text-3xl font-bold text-[#003087]">404</h1>
      <p className="mt-2 text-sm text-gray-500">Page not found. This page may have been moved or doesn&apos;t exist.</p>
      <Link href="/dashboard" className="mt-6">
        <Button className="bg-[#003087] hover:bg-[#002266]">Back to Dashboard</Button>
      </Link>
    </main>
  );
}
