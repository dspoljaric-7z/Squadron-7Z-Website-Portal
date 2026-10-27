"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns a short-lived signed URL for a private Supabase storage object.
 * Both `documents` and `avatars` buckets are private — use this instead of getPublicUrl().
 * Returns null while loading or if path is empty.
 */
export function useSignedUrl(
  bucket: "avatars" | "documents",
  path: string | null | undefined,
  expiresIn = 3600
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
      .then(({ data, error }) => {
        if (cancelled) return;
        setUrl(error || !data ? null : data.signedUrl);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bucket, path, expiresIn]);

  return { url, loading };
}
