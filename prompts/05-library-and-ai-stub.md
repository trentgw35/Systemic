# MILESTONE 5 — Library, group tags, and the AI stub UI

Finish the pilot-ready surface per Context 06:

- **Library (front page):** the signed-in user sees every item they can access across their workspaces: grouped by each item's Group tag (untagged items under "No group"), each row showing mode (Decision / What went wrong), title, group, owner, status (In progress / Final — … stamp), created and locked-in dates, and confirmed share while in progress. Search by title, owner name, or group; filter by mode, status, and date range. The item owner can edit an item's group tag from the item header and from the library row.
- **AI layer, stubbed and labeled:** wire the Context 05 adapter into the UI in exactly two places, behind `AI_FEATURES_ENABLED` (default off): (a) at item creation and inside a section, a "Draft with AI" entry point that, when enabled, calls `AIProvider.draftTree` and inserts the result as un-confirmed draft content under the normal rules; with no provider configured it shows a plain "AI drafting isn't configured" state; (b) an optional interpretation line under a fired check, visually distinct and labeled as interpretation, calling `AIProvider.interpret`. With the flag off, neither entry point renders. The checks themselves remain pure Context 03 code — do not route any check text or state through the provider.
- **Polish pass for the pilot:** empty states for new workspaces and sections; invite reminders are out of scope (no email sending beyond Supabase auth/invite defaults); confirm the contribution flow is fully usable at a 390px-wide viewport with no horizontal scrolling; keyboard-accessible sliders.

## Acceptance checks
1. Create items across two workspaces with different group tags: the library groups them correctly, and search finds an item by its owner's name and by its group.
2. Filter the library to locked RCCAs only: only matching rows appear.
3. Edit a group tag: the item moves to the new group in the library without a reload of its data.
4. With `AI_FEATURES_ENABLED` off: no AI UI anywhere. On, with no provider configured: the two entry points show the not-configured state and everything else works. (A live provider is configured by the human later; do not hard-code any provider or key.)
5. Full pilot rehearsal, two accounts: invite → join → create a decision → each confirms only their own section → lock in → both read the record. Time the second account's path; it should be completable in under 10 minutes.
Report per the master prompt's format, and include a short "pilot readiness" summary: what works, what is stubbed, and any spec ambiguities you resolved along the way.
