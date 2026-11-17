# Systemic

Make the decision together. Map what’s underneath it, so nothing important stays hidden — and remember why you made the call.

Multi-user app for weighted decision trees and reverse root-cause (RCCA) records. Built to the `context/` specification, milestone by milestone.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Deploy target: Vercel + Supabase

## Milestones

**Milestone 1** — Auth (magic link + Google OAuth UI), workspaces/invites, schema, AI stub, Context 03 demo seeds.

**Milestone 2 (current)** — Decision items with equal section shares + starter inputs; **Your section** coupled sliders (pin + live share-of-the-whole); confirm / un-confirm; server-enforced ownership + sum-to-100; stats strip; **Full picture** with pre-lock-in masking (hidden content absent from the API).

Still ahead: checks panel & lock-in (M03), structural editing / delegation / RCCA (M04), library (M05).

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

Or paste `supabase/migrations/*.sql` into the Supabase SQL Editor and run them in order (include `002_update_children_weights.sql` for the preferred atomic weight RPC).

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
| `npm run test:m2-engine` | Offline M02 engine/masking unit checks |
| `npm run accept:m2` | Live M02 acceptance against Supabase |

## Spec

Binding docs live in `context/`. Milestone prompts live in `prompts/`. Do not change Context 01 copy or Context 03 thresholds.
