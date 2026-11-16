# MILESTONE 1 — Scaffold, auth, workspaces

Build the application skeleton per the master prompt and Context 04:

- Next.js + TypeScript + Tailwind project; Supabase wired (local env documented in a README).
- Auth: sign up / sign in via email magic link and Google OAuth (Supabase Auth). Protected app routes.
- Data model: create the tables for User, Workspace, Membership, Item, Node, ActionNote per Context 04, with migrations. Include Item timestamps and group-tag now (cheap now, expensive later).
- Workspaces: create a workspace; invite by email and by shareable invite link; accept-invite flow that creates the account if needed; workspace switcher; member list with admin/member roles.
- An empty workspace home that lists items (none yet) — the item engine arrives in Milestone 2.
- AI adapter stub per Context 05: an `AIProvider` interface with a no-op implementation, provider/model/key read from env, and a feature flag `AI_FEATURES_ENABLED` defaulting to off.
- Seed: a demo workspace containing the two Context 03 worked examples as items (structure only is fine at this milestone if the engine is not yet interactive — but the rows must exist with correct labels, kinds, weights, owners, and confirmation states).

## Acceptance checks
1. A new user can sign up, create a workspace, and invite a second email address.
2. The second user can accept the invite, land in the workspace, and see the demo items listed.
3. A non-member cannot load the workspace or its items (server-side denial, not a hidden page).
4. The demo items' stored weights sum to 100 in every children-set.
Report per the master prompt's format.
