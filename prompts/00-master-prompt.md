# MASTER PROMPT — paste this first, with the whole `context/` folder available to the AI

You are building **Systemic**, a multi-user web application, from the attached specification. Before writing any code, read these context files in order and treat them as binding:

1. `context/01-product-brief.md` — what the product is, its principles, and its exact UI copy register.
2. `context/02-engine-spec.md` — the mechanics contract (tree, coupled sliders, confirmation, masking, structural editing, delegation, lock-in, RCCA mode).
3. `context/03-checks-and-thresholds.md` — the deterministic checks, exact v2 thresholds, and two worked examples you must use as acceptance fixtures.
4. `context/04-data-model-and-access.md` — entities and server-side access rules. Masking is a data rule, not a display rule.
5. `context/05-ai-layer.md` — where AI belongs (behind a configurable provider adapter) and where it must never be used (the checks).
6. `context/06-roadmap-and-scope.md` — what is in and out of scope.

## Stack (use exactly this unless the human approves a change)
- Next.js (App Router) + TypeScript, Tailwind CSS.
- Supabase: Postgres database, Supabase Auth (email magic link + Google OAuth), and row-level security or equivalent server-side authorization per Context 04.
- Deploy target: Vercel (app) + Supabase (data/auth). All secrets in environment variables.
- Mobile-first responsive design: the contribution flow (a user's own section) is designed for phone screens first; the full-picture and library views must also work on desktop.

## Non-negotiables
- Children-set weights always sum to exactly 100, enforced server-side in the same transaction as any change.
- UI copy uses the exact terms in Context 01. Do not invent synonyms (never "attest", "freeze", "flag", "effective weight" in UI text).
- The checks are computed from Context 03's rules in code. No LLM calls anywhere in the checks path.
- Pre-lock-in, the API must not send other users' section content to a non-owner (Context 04, rule 2).
- Do not build anything listed as out of scope in Context 06.

## How to work
- Build in the milestone order given in the `prompts/` folder (01 scaffold → 02 engine core → 03 checks & records → 04 editing, delegation & RCCA → 05 library & AI stub). The human will paste each milestone prompt in turn; do not run ahead into later milestones.
- After each milestone: run the milestone's acceptance checks, fix failures, and report (a) what was built, (b) acceptance results, (c) anything in the spec you found ambiguous and how you resolved it.
- If a spec detail is silent, choose the simplest behavior consistent with the principles in Context 01 and note the choice in your report. Do not silently change a specified behavior.
- Seed the two worked examples from Context 03 as demo items in a demo workspace so acceptance can be verified by eye.

Begin by confirming you have read the six context files, restating the stack and the five non-negotiables in your own words, and listing any blocking questions. Do not write code until the human confirms.
