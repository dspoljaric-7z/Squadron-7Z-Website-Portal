# Sea Cadet Portal — Database Handoff

**Snapshot date:** 2026-10-26. Written by a previous agent session (Freebuff/Buffy).
**Project ref:** `yetrzecfdckzmnqwrffm`

> **Read this before acting.** Everything below describes the *live* database as it
> stood on 2026-10-26. It is a record of completed work, not a plan. Some of it may
> already be stale. **Re-read live state from `information_schema` / `pg_policies` /
> `pg_trigger` / `pg_proc` before making changes.** Do not trust this file as the
> source of truth for schema, and do not re-run the migration blindly.

## What this workspace contains

Only `supabase/migrations/20261026_security_hardening.sql` (39 KB). **There is no
application code here.** Anything that requires reading or editing the app — signed
URLs, RLS client calls, UI behaviour — cannot be verified from this workspace.

The migration file is a *record* of what was applied, kept in sync so that re-running
it is idempotent and cannot reintroduce fixed vulnerabilities. It is **not** in
Supabase's migration history (`supabase_migrations.schema_migrations`) because the
management migration API returned 403 (token lacked write scope); the same SQL was
applied through the beta SQL endpoint instead. If you use the Supabase CLI, baseline
it before `supabase db push`.

## How DDL was applied (and how to verify it)

- Applied via the PostgREST/SQL endpoint, **not** the migrations API.
- **Multi-statement DDL returns an empty response body.** An empty result proves
  nothing. After every change, verify by querying the catalog: `pg_proc`,
  `pg_policies`, `pg_trigger`, `pg_constraint`, `pg_class`, `storage.buckets`.
- Behavioural tests were run inside **rolled-back transactions** with `set local role
  anon` / impersonated profiles, so no test data was committed.
- Transient Cloudflare 502s were observed from the management API. Services reported
  `ACTIVE_HEALTHY` throughout; back off and retry rather than treating it as failure.

---

# PART 1 — Completed and verified live

## Earlier hardening pass (10 items)

1. **`profiles` RLS rewritten.** Removed the blanket authenticated-read policy; added
   self / staff / roster-scoped policies. Removed loose update and insert policies.
2. **`incident_reports` locked down** — 3 scoped policies, no `ALL`, no `DELETE`.
3. **Private storage.** `documents` and `avatars` buckets are no longer public; the
   unauthenticated avatar-read policy was dropped.
4. **Audit logging** — triggers on 4 sensitive tables; client `INSERT` into
   `audit_log` revoked.
5. **Profile guard triggers.** An update trigger guards `is_command`; a second trigger
   reverts privilege self-escalation (role, `is_command`, `is_maa`,
   `can_manage_discipline`, `parent_of`). **The `is_command()` path is the
   break-glass bypass in this guard** — see the fixes in Part 2 for why that matters.
6. **Roster-first support.** Removed `NOT NULL` from `profiles.user_id`; unique index
   still enforced. Members can exist without a login. The insert trigger was fixed:
   it previously set `user_id` from the *officer adding the member*, which would have
   collided with that officer's own unique `user_id`.
7. **Signup opened.** `handle_new_user` no longer blocks anything and always writes an
   unapproved `cadet`, ignoring client-supplied `role` metadata (that was a privilege
   hole). The same clamp was applied to `handle_google_oauth_user`.
8. **`is_staff()` requires `approved AND active`** and includes `snco`.
9. **Added** `member_permissions`, `profile_guardians`, `has_permission()`; backfilled
   56 allowlist rows.
10. **Policy cleanup.** Removed 9 redundant policies (each subsumed by a broader
    neighbour) and gave all 3 previously deny-all tables real policies:
    `unit_settings` (read by members, write by command), `cadet_checklists`
    (cadet-self / staff), `billet_interests` (cadet-self apply / staff review).
    **No table is left with RLS enabled and zero policies.**

## Table consolidation (`legacy` schema)

Four duplicated table pairs were retired, choosing the side that holds data:

| Live table | Archived to `legacy` |
|---|---|
| `long_range_plan` | `tsw_long_range_plans` |
| `plan_of_day` | `tsw_plan_of_day` |
| `drill_attendance` | `attendance` |
| `prospects` | `recruiting_prospects` |

Archived tables live in the `legacy` schema with `security_invoker` **views** in
`public`, so existing read queries still resolve while writes stop.

**Important unresolved editorial decision:** `tsw_long_range_plans` held 17 real rows,
but all 17 were for weeks the live plan already covers with **different**
theme/notes/status. The merge inserted nothing — live content was deliberately not
overwritten. Those 17 alternate versions are preserved in `legacy.tsw_long_range_plans`.
Someone must decide, per week, whether the live or archived wording wins.

`tsw_calendar` and `tsw_meeting_sessions` are empty and from the same abandoned
generation, but were outside the approved scope and were left untouched.

## Function audit fixes (13 findings)

1. **CRITICAL — invite-code auth bypass, closed both halves.** `invite_codes_validate`
   was a SELECT policy with `roles = {public}` and condition `used = false AND not
   expired`, so **anonymous visitors could read the `code` and `role_grant` columns**.
   `consume_invite_code(text)` was `SECURITY DEFINER` with no auth check and was
   executable by `anon` (Postgres grants `EXECUTE` to `PUBLIC` by default). Proven
   exploitable: as `anon`, 1 code visible → `consume_invite_code()` returned
   `officer`. **Fixed:** policy dropped; function rewritten to require a signed-in
   caller, record `used_by`, and set `search_path`; anon execute revoked.
   *Verified: anon sees 0 codes; calling the function returns `permission denied for
   function consume_invite_code`.* `invite_codes` now has 2 policies, both
   `is_officer()`.
2. **`is_command()` and `is_maa_or_command()` now require `active`,** not just
   `approved`. A departed member no longer keeps command authority — which also closes
   the break-glass bypass in the profile guard trigger.
3. **`has_permission()` grant branch now requires `approved AND active`.** The
   `member_permissions` check had been placed outside the gate. (This bug was
   self-inflicted in an earlier pass.)
4. **`sync_absence_to_drill_attendance` prefers `NEW.drill_session_id`** instead of a
   date lookup. **Severity corrected:** `drill_sessions` has a UNIQUE constraint on
   `date` (`drill_sessions_date_key`), so only one session can exist per date — the
   old lookup could never pick the wrong one. This was theoretical, not live. The fix
   is still more correct in intent.
5. **Denied absences no longer pre-mark cadets absent.** Approved → `excused` with
   `recorded_by` set. Denied → removes only an `excused` row that this sync created,
   leaving genuine attendance records untouched.
   *Verified: approve produced `excused`; approve-then-deny left 0 rows, 0 marked absent.*
6. **`SET search_path` added to all remaining `SECURITY DEFINER` functions** — now
   20 of 20 (8 were missing).
7. **Mojibake in user-visible notification titles fixed** — e.g.
   `'Correction Issued ‚Äî Tier '` → `'Correction Issued - Tier '`. Confirmed the
   database encoding is fine (`ALPO — Sea Cadets` stores a real em-dash correctly), so
   this was genuinely double-encoded text in the function *source*, not a storage issue.
8. **Execute grants locked down.** `anon` can no longer execute mutating or trigger
   functions. **Read-only policy helpers are deliberately still callable by anon** —
   several `roles = {public}` RLS policies evaluate them, and revoking them would turn
   anonymous reads into "permission denied" errors instead of empty result sets. They
   return null/false for anon, so nothing leaks.
9. **`user_id` is no longer reassignable by staff** editing another member. Previously
   an NCO could orphan a profile by nulling it.
10. **`updated_at` machinery deduped** — removed the second trigger on `prospects`;
    repointed `absence_requests` at the shared `set_updated_at()`; dropped two
    now-unused functions.
11. **`is_staff_member()` now delegates to `is_staff()`** — one source of truth.
12. **`billet_seniority()` — INTENTIONALLY NOT CHANGED.** See Part 3.
13. **`is_parent_of()` now requires the guardian to be `approved AND active`.**

## Final verified state

| Invariant | Value |
|---|---|
| `SECURITY DEFINER` functions setting `search_path` | 20 / 20 |
| `anon` can execute `consume_invite_code` | no |
| Mojibake in function source | 0 |
| `invite_codes` policies | 2, both `is_officer()` |
| Tables with RLS on and zero policies | 0 |
| Archived tables in `legacy` | 5 |
| Audit triggers | 7 |
| `updated_at` triggers on `prospects` | 1 |
| `profiles.user_id` NOT NULL | no |
| `documents` / `avatars` public | neither |
| Public site content readable by anon | yes (trainings 14, faqs 14, alumni 4, leadership 4, profiles 0) |

---

# PART 2 — NOT DONE. This is the open work.

## 2.1 The approved-members sweep — HIGHEST PRIORITY

Roughly **33 policies** still grant access to "any authenticated user" or to `public`,
and this was never swept. Opening signup changed the threat model: *authenticated* now
includes anyone who typed an email and was never approved.

Confirmed examples (re-enumerate live before editing):

- `prospects_select`, `prospects_update`, `prospects_insert` — **any signed-in user can
  read and edit the recruiting pipeline.** With open signup this exposes PII on
  prospects who are not even members, to unapproved strangers. `prospect_notes_all`
  is the same shape (`ALL`, `true`).
- `long_range_plan` — policy *"Staff can read long_range_plan"* has condition `true`
  and `roles = {public}`. **World-readable, including anonymous visitors.** The name
  does not match the behaviour.
- `pod_select` / `pod_write` on `plan_of_day` — any authenticated user can write the
  plan of the day.
- `checklist_all`, `announcements_select_all`, `duty_roster_select_all`, `photos_select`,
  `photo_albums_select`, `unit_settings_select`, `pod_templates_select`,
  `notification_templates_select`, `tsw_meeting_sessions`.

**Approximately a dozen of the 33 are legitimately public** and should be left alone:
`public_alumni`, `public_faqs`, `site_settings`, `trainings`, `leadership`, and the
public contact-form `INSERT` on `contact_inquiries`. Do not lock these down — it would
break the public site.

This needs a per-table product decision, which is why it was never applied. Do not
guess: if a table's intent is unclear, ask rather than locking it.

## 2.2 App-side signed URLs — NOT a database change

`documents` and `avatars` are private now. The app must use `createSignedUrl()` for
both instead of `getPublicUrl()`. Nothing is visibly broken today (`avatars` is empty,
`documents` has 2 files), but **the next document upload or avatar render will fail
silently** until this is done. This cannot be fixed from this workspace.

## 2.3 Intentional behaviour changes that may break a screen

These are deliberate, not bugs — but any of them could surface as an app-side failure:

- Redeeming an invite code now **requires a signed-in user**. Anonymous redemption is
  gone by design.
- Deactivating an officer **immediately drops command powers** (`is_command` requires
  `active`).
- **Unapproved parents lose profile access** (`is_parent_of` requires approved+active).
- **Denying an absence no longer marks the cadet absent.**

## 2.4 Migration history

The schema change is not baselined in `supabase_migrations`. Running `supabase db push`
without baselining could conflict. Baseline it if the CLI is in use.

## 2.5 Verbose caveat — the app is untested

The **database** was verified thoroughly (catalog checks plus rolled-back behavioural
tests impersonating a real cadet). The **app** was never exercised end to end, because
there is no application code in this workspace. Signup, document downloads and avatar
rendering are unverified. Do not report these as working.

---

# PART 3 — Deliberate non-changes and their reasons

**`billet_seniority()` still uses a hardcoded rank mapping rather than reading the
`billets` table.** This was the one place "fix everything" was resisted. Reasons:

- `billets` contains **duplicate names** — "Supply Petty Officer" ×3, "PFT Petty
  Officer" ×4.
- `billets.sort_order` **disagrees** with the function's hardcoded ranking (Command
  Chief is 3 in the table, 4 in the function).

Making the function table-driven would silently reorder the chain of command in the UI
and would be ambiguous about which duplicate wins. Fix the data first if this is ever
changed.

**The ~38 other empty tables were NOT archived.** "Empty" does not mean "unused" here:

- `absence_requests` has a trigger syncing into `drill_attendance`
- `contact_inquiries` backs the public contact form
- `incident_reports` is a live hardened feature
- `announcements` and `photos` have storage buckets wired up
- `pips` has its own notification trigger

Converting these to read-only views would break working screens the moment someone
first used them. Deciding which of `pips`, `board_results`, `uniform_inspection_*`,
`watch_bills`, `cadet_paperwork` are actually shipping is a product question, not a
database one.

---

# PART 4 — Working notes for whoever picks this up

- **Verify, don't assume.** Multi-statement DDL returns an empty body. Query the
  catalog after every change.
- **Test in rolled-back transactions.** `begin; set local role anon; ...; rollback;`
  is how the behavioural claims above were established. Pl/pgSQL validates SQL at
  first execution, not at creation, so a function referencing a missing column on an
  empty table stays broken and silent until first use.
- **Keep the migration file in sync.** Any further change should be appended to
  `supabase/migrations/20261026_security_hardening.sql` (it has numbered sections) so
  a re-run cannot undo the fix.
- **Postgres grants `EXECUTE` to `PUBLIC` by default.** New functions are anon-callable
  unless revoked.
- **RLS policies with `{public}` roles evaluate helper functions** — if you revoke
  `EXECUTE` on those helpers, anonymous reads start erroring instead of returning
  empty. Grant read-only helpers back to anon.
- **Concurrent agents:** if another agent is editing this database at the same time,
  agree that only one applies DDL at a time, re-read state before acting, and never
  both edit the same function or policy. An overwritten `is_command()` would quietly
  undo a security fix.
