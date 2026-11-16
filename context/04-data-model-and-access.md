# Systemic — Data Model and Access Rules (Context 04)

## Entities
- **User** — id, name, email, auth identity.
- **Workspace** — a group of people who share items (a team). id, name, created-by. (In conversation the founder may call this a "group"; in the data model it is the membership container. The per-item Group tag below is a separate, lighter concept — do not merge them.)
- **Membership** — user × workspace, role: `admin` or `member`.
- **Item** — one decision (mode=`decision`) or problem (mode=`rcca`). Fields: id, workspace-id, mode, title, group-tag (free text, nullable), created-by, created-at, updated-at, locked-at (nullable), lock stamp text (nullable), expected-areas (rcca only, list of strings, nullable).
- **Node** — id, item-id, parent-id (nullable for Level-1 sections; the item root is implicit), label, kind (`opinion` | `anecdote` | `advisory` | `data` | `process`), local weight (number; siblings sum to 100), owner-id (the user who owns this node's children-set; null for leaves), sort order.
- **Confirmation** — per children-set: represent as `confirmed` (bool) + `confirmed-at` on the parent node (the node whose children form the set). Only the set's owner confirms.
- **Delegation** — represent on the parent node: `owner-id` = current owner of the children-set; `delegated-from` (nullable user-id) records who handed it down. Take-back restores owner-id to delegated-from and clears it.
- **Action note** (rcca, post-lock-in) — id, item-id, node-id (a cause), text, owner name, due date.

## Roles within an item
- **Item owner** (Decision Owner / Facilitator): creates the item, adds/removes Level-1 sections, assigns section owners, edits the group tag, locks in the item, deletes the item.
- **Section owner**: owns one or more children-sets; weights, structural edits, confirmation, delegation within them.
- Any workspace member may be assigned as a section owner or delegatee.

## Access rules (enforce server-side)
1. A user can access an item only if they are a member of its workspace.
2. **Pre-lock-in masking is a data rule, not a display rule.** API responses for an item must not include other users' section content (labels, weights, structure) to a non-owner before lock-in. The client receives: the item title, the user's own sections in full, bare placeholders for hidden sections (existence only — no label, weight, or counts), aggregate stats (confirmed share, opinion/suspicion share, data/verified share, total check), and the checks panel output. Aggregate stats are computed server-side over the full tree; they are intentionally visible to all members (they describe the whole, not any person's section).
3. Context chip data (path of ancestor labels + the section's share of the whole) is visible to that section's owner.
4. Post-lock-in, all members of the workspace can read the full tree and record.
5. Only the item owner can lock in, delete, or edit the group tag. Only a children-set's current owner can mutate that set (weights, structure, tags, confirmation, delegation).
6. If using Postgres with row-level security (e.g., Supabase), express rules 1–5 as RLS policies or as equivalent server-side authorization in the API layer. Do not rely on the client to hide data it has received.

## Invites and joining
- Workspace admins invite by email or shareable invite link. Accepting an invite creates the account (if needed) and the membership in one flow.
- A user may belong to many workspaces and can switch between them.

## Persistence and integrity
- The sum-to-100 invariant per children-set is enforced in the same transaction as any weight/structure change.
- Lock-in is a single transaction that stamps locked-at + stamp text and flips the item to read-only (except rcca action notes, which are added after lock-in).
- Every mutation updates the item's updated-at.
