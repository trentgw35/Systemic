# Systemic

Make the decision together. Map what’s underneath it, so nothing important stays hidden — and remember why you made the call.

Multi-user app for weighted decision trees and reverse root-cause (RCCA) records. Built to the `context/` specification, milestone by milestone.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Deploy target: Vercel + Supabase

## Milestone 1 (this slice)

- Auth: email magic link + Google OAuth UI (Google provider optional until configured)
- Workspaces: create, invite by email or shareable link, accept invite, switcher, member list
- Schema for User/Profile, Workspace, Membership, Item, Node, ActionNote
- AI adapter stub (`AIProvider`) behind `AI_FEATURES_ENABLED` (default off)
- Demo workspace seed: both Context 03 worked examples

The interactive contribution engine (sliders, checks, lock-in) arrives in later milestones.

## Local setup

1. Copy env and fill values:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` (publishable or legacy anon key)
- `SUPABASE_SERVICE_ROLE_KEY`

2. Apply the database migration (needs the **database password** from Supabase → Project Settings → Database):

```bash
# in .env.local:
# SUPABASE_DB_PASSWORD=your-db-password
npm run db:migrate
```

Or paste `supabase/migrations/001_initial.sql` into the Supabase SQL Editor and run it.

3. Auth redirects: in Supabase → Authentication → URL configuration:

- **For the published app**, set Site URL to `https://systemic.apps.grok.bot` and add these Redirect URLs:
  - `https://systemic.apps.grok.bot/auth/callback`
  - `https://systemic.apps.grok.bot/**`
- **For local dev**, also allow:
  - `http://127.0.0.1:3456/auth/callback`
  - `http://127.0.0.1:3456/**`

If Site URL stays on `localhost:3000`, magic-link emails send people there and the browser shows “connection refused.”

4. Run the app:

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3456](http://127.0.0.1:3456).

### Google OAuth (optional)

1. Supabase Dashboard → Authentication → Providers → Google → enable
2. Create OAuth credentials in Google Cloud Console (Web application)
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Paste Client ID and Secret into Supabase Google provider settings

Until this is configured, use email magic links. The Sign-in page still shows “Continue with Google”.

### Email magic links

Enable Email provider in Supabase Auth (on by default). For local testing, check Auth → Users and the email inbox / Supabase Auth logs for the link.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 3456 |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `supabase/migrations` via pooler |
| `npm run verify:demo` | Offline check that demo trees sum to 100 and hit Context 03 fixture stats |

## Spec

Binding docs live in `context/`. Milestone prompts live in `prompts/`. Do not change Context 01 copy or Context 03 thresholds.
