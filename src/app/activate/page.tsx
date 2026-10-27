"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const tokenHash = searchParams.get("token_hash");

  useEffect(() => {
    if (!tokenHash) {
      setStatus("error");
      setErrorMsg("Invalid activation link. Ask an officer to generate a new one.");
    }
  }, [tokenHash]);

  const activate = async () => {
    if (!tokenHash) return;
    setStatus("loading");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error) {
      setStatus("error");
      setErrorMsg("This activation link has expired or already been used. Ask an officer to send a new one.");
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center space-y-5">
        {/* SQ7Z logo mark */}
        <div className="mx-auto h-12 w-12 rounded-xl bg-[#003087] flex items-center justify-center">
          <span className="text-white font-bold text-lg">7Z</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-bold text-gray-900">Squadron 7 Zulu Portal</h1>
          <p className="text-sm text-gray-500">Click below to activate your account</p>
        </div>

        {status === "error" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMsg}
          </div>
        ) : (
          <button
            onClick={activate}
            disabled={status === "loading" || !tokenHash}
            className="w-full h-11 rounded-xl bg-[#003087] text-sm font-semibold text-white tracking-wide hover:bg-[#002266] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === "loading" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Activating…
              </>
            ) : (
              "Activate My Account"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateContent />
    </Suspense>
  );
}
