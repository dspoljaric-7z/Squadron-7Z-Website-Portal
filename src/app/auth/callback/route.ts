import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const origin = requestUrl.origin;

  if (error) {
    const isOAuth = requestUrl.searchParams.get("provider") !== null || error === "access_denied";
    return NextResponse.redirect(`${origin}/login?error=${isOAuth ? "oauth_denied" : "link_expired"}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
  }

  // Verify the user has a profile (i.e., was on the allowed_emails list)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // First try matching by user_id (already linked account)
    const { data: profileById } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profileById) {
      // Fall back to matching by email — allows Google sign-in for existing email/password accounts
      const admin = createAdminClient();
      const { data: profileByEmail } = await admin
        .from("profiles")
        .select("id, user_id")
        .eq("email", user.email ?? "")
        .single();

      if (!profileByEmail) {
        // Not on the allowed list at all
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_authorized`);
      }

      // Link the Google identity to this profile by updating user_id
      await admin
        .from("profiles")
        .update({ user_id: user.id })
        .eq("id", profileByEmail.id);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
