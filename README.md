# Squadron 7-Zulu & TS Wasp — Member Portal

A full-stack portal for a U.S. Naval Sea Cadet Corps unit, built with Next.js 14 (App Router), Supabase (auth, database, storage, realtime), Tailwind CSS, and shadcn/ui.

## Features

- Email/password authentication with invite-code registration and officer approval
- Role-based access control: Cadet, NCO, Officer/Staff, Parent/Guardian
- Live-syncing dashboard, training calendar, attendance, duty roster, announcements, document library, and photo gallery
- In-app inline & modal editing everywhere, with optimistic updates and "Saving... / Saved ✓" indicators
- Admin dashboard for user management, invite codes, and site settings

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components, Server Actions)
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **UI:** Tailwind CSS + shadcn/ui + lucide-react icons
- **Rich text:** Tiptap

## Getting Started

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com).

### 2. Run the database migrations

Using the Supabase CLI (recommended):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies everything in `supabase/migrations/`:

- `0001_schema.sql` — tables, enums, indexes
- `0002_functions_and_rls.sql` — helper functions + Row Level Security policies
- `0003_realtime_and_storage.sql` — enables Realtime on all tables + creates storage buckets
- `0004_registration.sql` — invite-code validation and the trigger that creates a `profiles` row on sign-up

Then seed the initial invite codes and site settings:

```bash
npx supabase db execute -f supabase/seed.sql
```

(Alternatively, paste the contents of each file into the Supabase SQL Editor and run them in order.)

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (Project Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Seeding the first Officer account

1. Run `supabase/seed.sql` (see above) — this inserts an invite code `SQ7Z-OFFICER-SETUP` that grants the **Officer** role.
2. Go to `/register`, fill in your details, and enter `SQ7Z-OFFICER-SETUP` as the invite code.
3. Log in. Because the trigger sets `approved` based on `site_settings.auto_approve_registrations` (default `false`), you may need to approve your own account directly in the Supabase Table Editor the first time:
   ```sql
   update public.profiles set approved = true where email = 'you@example.com';
   ```
4. From then on, use the **Admin** dashboard to approve new registrations, generate invite codes for Cadets/Parents, and promote other accounts to NCO/Officer.
5. Revoke `SQ7Z-OFFICER-SETUP` from the Admin → Invite Codes tab once setup is complete.

## Project Structure

```
src/
  app/
    (auth)/        login, register, server actions
    (app)/         protected app shell — dashboard, calendar, attendance,
                    roster, announcements, cadets, profile, documents,
                    gallery, admin
    page.tsx       public landing page
  components/      UI components grouped by feature
  lib/             Supabase clients, middleware, nav config, constants
  types/           database types
supabase/
  migrations/      SQL migrations (run in order)
  seed.sql         initial invite codes + site settings
```

## Notes

- Realtime is enabled on every table; pages show a green "Live" indicator when subscribed.
- Storage buckets (`avatars`, `announcements`, `documents`, `photos`, `site`) are created by migration `0003` with RLS policies matching the access rules above.
