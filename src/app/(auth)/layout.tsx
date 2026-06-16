import { Anchor } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#003087] bg-white">
          <Anchor className="h-7 w-7 text-[#003087]" />
        </div>
        <h1 className="text-xl font-bold text-[#003087]">Squadron 7-Zulu & TS Wasp</h1>
        <p className="text-sm text-gray-500">U.S. Naval Sea Cadet Corps Member Portal</p>
      </div>
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
