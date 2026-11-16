# Systemic — Roadmap and Scope (Context 06)

## Why this build exists
A single-user prototype has validated the engine, the copy register, and the v2 thresholds. The next step is a live-hosted, multi-user version so real collaborators can create accounts, join a workspace (group), and run real decisions and RCCAs together — ahead of a facilitated concierge pilot with a friendly planning team.

## In scope for this build
- Accounts and authentication; workspaces with invites and membership.
- Items (decisions + RCCAs) with the full engine: coupled sliders, structural editing, delegation, confirmation, masking, checks v2, graded lock-in, records.
- Timestamps (created / last edited / locked in) and the per-item Group tag.
- A library (front page): items grouped by Group tag, searchable by title / owner / group, filterable by mode, status, and date.
- RCCA corrective actions with the coverage line.
- Mobile-first contribution experience (a phone is the primary contribution surface); the full picture and facilitation views must work well on desktop and remain usable on mobile.
- The AI adapter interface + stub (Context 05); full AI features are the final milestone, feature-flagged.

## Out of scope (do not build)
- Payments or billing.
- Native mobile apps (responsive web only).
- Slack / Teams / Notion integrations.
- Outcome tracking (revisiting a decision after results arrive), voting or consensus mechanics, portfolio analytics beyond the library list.
- Any change to the thresholds in Context 03 or the copy in Context 01.

## Success criteria for the pilot-ready state
- Two people on different devices/accounts can join one workspace, each build only their own section of the same decision without seeing the other's content, and lock in a record both can read in full.
- The two worked examples in Context 03 reproduce their expected check states exactly.
- A new user can go from invite link to a confirmed section in under 10 minutes without instructions beyond the UI.

## Later roadmap (context only — not this build)
- Full AI drafting and narrative interpretation (Context 05).
- Live-session facilitation mode (a meeting view: framing, progress-only display during silent building, reveal order — aggregates before tree).
- Reopening a locked decision in reverse mode as an RCCA, using the original tree as the starting skeleton.
- Per-workspace AI provider configuration; integrations; outcome tracking.
