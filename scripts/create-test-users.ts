/**
 * Creates two test users: one NCO and one Cadet.
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local
 *   2. npx tsx scripts/create-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  {
    email: "nco.test@squadron7zulu.org",
    password: "TestNCO2024!",
    full_name: "Test NCO",
    role: "nco" as const,
    rank: "Petty Officer Second Class",
    billet: "Training Petty Officer",
  },
  {
    email: "cadet.test@squadron7zulu.org",
    password: "TestCadet2024!",
    full_name: "Test Cadet",
    role: "cadet" as const,
    rank: "Seaman",
    billet: null,
  },
];

async function main() {
  for (const user of TEST_USERS) {
    console.log(`\nCreating ${user.role}: ${user.email}`);

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (authErr) {
      console.error(`  Auth error: ${authErr.message}`);
      continue;
    }

    const userId = authData.user.id;
    console.log(`  Auth user created: ${userId}`);

    // Check if profile was auto-created by trigger
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing profile
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          role: user.role,
          rank: user.rank,
          billet: user.billet,
          approved: true,
          active: true,
          email: user.email,
        })
        .eq("user_id", userId);
      if (upErr) console.error(`  Profile update error: ${upErr.message}`);
      else console.log(`  Profile updated`);
    } else {
      // Insert new profile
      const { error: insErr } = await supabase.from("profiles").insert({
        user_id: userId,
        full_name: user.full_name,
        role: user.role,
        rank: user.rank,
        billet: user.billet,
        approved: true,
        active: true,
        email: user.email,
      });
      if (insErr) console.error(`  Profile insert error: ${insErr.message}`);
      else console.log(`  Profile created`);
    }

    console.log(`  ✅ Done — login: ${user.email} / ${user.password}`);
  }

  console.log("\n✅ Test users setup complete.");
}

main().catch(console.error);
