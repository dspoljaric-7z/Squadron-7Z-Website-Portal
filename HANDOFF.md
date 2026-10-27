# SQ-7 Portal — Handoff Guide

This document is for future leaders, officers, or staff who need to maintain or update the SQ-7 NSCC portal. You do not need to be a developer to understand most of this — read the whole thing once before touching anything.

---

## What this is

The SQ-7 portal is a private web app for unit staff and cadets. It lives at a Vercel URL (see credentials). It was built with:

- **Next.js** — the web framework (JavaScript/TypeScript)
- **Supabase** — the database and user authentication backend
- **Vercel** — the hosting platform that makes the app available on the internet

All three are managed online through dashboards. You do not need to install software to make simple changes — but you do need someone with programming knowledge to modify the code.

---

## Where to find credentials

> **IMPORTANT:** Do not store credentials in this file or commit them to git. The credentials currently live in a `.env.local` file in the project root (never committed) and as Environment Variables in the Vercel project dashboard.

1. **Vercel dashboard** — [vercel.com](https://vercel.com) → sign in with the account that owns the project (ask outgoing CO/XO for credentials)
2. **Supabase dashboard** — [supabase.com](https://supabase.com) → same login or a shared account
3. **Project source code** — wherever the git repo or zip file was handed off

The keys you need for `.env.local` are:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API (secret — keep safe)
- `NEXT_PUBLIC_SITE_URL` — your Vercel deployment URL

---

## How to deploy a change (non-technical summary)

Deploying = publishing an updated version of the site so users see it.

1. Have a developer make changes to the source code files on their computer
2. Open a terminal inside the `sq7-portal` folder
3. Run:
   ```
   npx vercel --prod
   ```
4. Wait ~2 minutes for it to finish. The new version is live.

> **Note:** The project does NOT use git push to deploy. Always use `npx vercel --prod` from the project directory.

---

## How to make a database change

The database lives in Supabase. If a code change requires a new table or column:

1. Log into [supabase.com](https://supabase.com) → your project → **SQL Editor**
2. Paste the SQL migration the developer wrote
3. Click **Run**
4. Then deploy the code change (see above)

Database changes cannot be undone automatically — be careful, and test on a copy first if possible.

---

## How to add a new user

You do NOT need to touch the code or database for this.

1. Log into the portal as an officer
2. Go to **Settings → Admin tab**
3. Use the **Invite Member** form — enter email, name, rank, role
4. They will receive an email with a setup link
5. Once they complete setup, they appear in the roster

---

## How to reset a user's password

1. Log into the portal as an officer
2. Go to **Admin** page → find the user
3. Click **Activate** — this sends them a new password-setup email
4. They set a new password through the link

Or: have them use the "Forgot password" link on the login page (if enabled).

---

## Who to contact if something breaks

| Issue | Who |
|-------|-----|
| Site is down / Vercel error | Check [vercel.com](https://vercel.com) status; look at deployment logs |
| Database error / data missing | Check [supabase.com](https://supabase.com) → Logs |
| Bug in the app | Developer who last worked on it (see git history) |
| Billing on Vercel or Supabase | The account email on file |

Both Vercel and Supabase have free tiers that are sufficient for a unit this size. If billing kicks in, it is because usage has grown significantly.

---

## Common things that are NOT code changes

These are done through the portal's admin UI and require no developer:

- Adding/removing cadets
- Changing ranks, billets, divisions
- Posting announcements
- Editing the unit name or drill location default (Settings → Unit Settings)
- Customizing notification email text (Settings → Email Templates)
- Adding qualification types
- Granting or revoking permission flags (Access Control)

---

## File structure (for developers)

```
sq7-portal/
├── src/
│   ├── app/(app)/          # All portal pages (each folder = a route)
│   ├── components/         # Reusable UI components
│   ├── lib/                # Shared utilities (Supabase client, formatting, nav)
│   └── types/database.ts   # TypeScript types — update when adding DB columns
├── .env.local              # Secret keys (NEVER commit this)
├── package.json            # Dependencies
└── HANDOFF.md              # This file
```

Key things to know when editing code:
- **New tables** need to be created in Supabase AND their types added to `src/types/database.ts`
- **New pages** go in `src/app/(app)/` — create a folder with a `page.tsx` file
- **Nav items** are configured in `src/lib/nav.ts`
- **Server actions** (DB writes from the UI) live in `actions.ts` files near their page
- **Deploy with** `npx vercel --prod` — not git

---

## In-portal admin guide

There is also a built-in guide page inside the portal at `/guide`. It covers day-to-day tasks like running drills, managing discipline cases, and configuring settings — written for staff, not developers. Staff can access it from the sidebar under Admin.

---

*Last updated: September 2026*
