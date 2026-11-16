# Systemic — Engine Specification (Context 02)

This is the exact mechanics contract. A working reference implementation exists as a single-user prototype; its behavior is the specification wherever this document is ambiguous.

## The tree
- An **item** is one decision (forward mode) or one problem (reverse mode / RCCA).
- The item's root holds **sections** (Level-1 nodes). Each node may hold child **inputs**, recursively, to any depth.
- Every node has: a label, an evidence kind, a local weight, and an owner for its children-set (the person responsible for the node's children). Leaf nodes have no children-set.
- **Local weights:** within any children-set, weights sum to exactly 100. This invariant must hold after every operation, enforced server-side.
- **Share of the whole (effective weight):** a node's share = the product of local weights along the path from the root, divided appropriately (root children are direct percentages). All leaf shares sum to exactly 100.

## Evidence kinds
Forward labels → reverse labels (same underlying kinds):
- opinion → "Personal opinion" / "Suspected, unverified"
- anecdote → "Anecdotal evidence" / "Reported, not checked"
- advisory → "Trusted advisors" / "Expert assessment"
- data → "Data & analysis" / "Verified in records"
- process → "Detailed breakdown" (both modes; a node whose children carry the detail — the node itself is not counted as evidence)

## Coupled sliders
- Editing one input's weight redistributes the difference proportionally across its unlocked siblings. A sibling can be **locked (pinned)** to hold its weight during redistribution.
- While editing, each input shows two numbers: its local share ("Within your section") and its live share of the whole ("Of the whole decision" / "Of the whole problem").
- There must be no reachable state where a children-set does not sum to 100 — no error states for the user to fix.

## Confirmation
- Each children-set is confirmed (or not) by its owner alone. Only the owner can confirm, edit weights in, or structurally edit their children-set. Enforce server-side, not just in the UI.
- Any change inside a confirmed children-set — weight edit, structural edit, tag change, delegation — flips that set back to Not yet confirmed.
- **Confirmed share** = the total share-of-the-whole sitting under confirmed children-sets. It drives the graded lock-in stamp (Context 03).

## Privacy / masking
- Before lock-in, a user sees: the root title, their own sections and delegated sub-sections in full, a context chip per section (path from root + that section's share of the whole), aggregate progress (sections confirmed count, confirmed-so-far %), and the checks panel.
- Other users' section content — labels, weights, structure — is hidden until lock-in. Hidden sections render as a bare "Hidden until the decision is locked in" row: no label, no percentage, no controls.
- After lock-in, the full tree is visible to all item members.

## Structural editing (owner-only, pre-lock-in)
- **Add an input:** enters at 10% of the section, taken proportionally from unlocked siblings; with a single sibling, they split 50/50. New Level-1 sections (added by the item owner) follow the same rule at the top level.
- **Remove an input:** removes its whole sub-tree; its weight redistributes proportionally across remaining siblings.
- **Rename** any input in your section; **change its evidence tag**.
- **Break down:** turn a leaf into a parent with two starter sub-inputs at 50/50, placeholder labels, carrying the leaf's evidence tag; the parent becomes kind=process.
- The item owner (Decision Owner / Facilitator) can add and remove Level-1 sections and assign their owners.

## Delegation
- A section owner can **delegate** any input in their section to another member: that input's children-set becomes the delegatee's section. A leaf first breaks down into two 50/50 starters (tag carried). An existing sub-tree keeps its content and weights; only ownership transfers, and the set becomes un-confirmed until the delegatee confirms.
- The delegatee sees the delegated sub-section in their own view, with the full-path context chip and its share of the whole, and can weight, reshape, and confirm it like their own section.
- The delegator sees "Delegated to {name}" and, until confirmation, "Waiting on {name}". The delegator cannot edit or confirm the delegated set. The delegator may **take back** the delegation at any time before lock-in; the delegatee's content and weights remain as left.
- Delegation chains to any depth. Self-delegation is not allowed. All delegation controls disable at lock-in.

## Lock-in
- Locking in freezes the item: no weight, structural, confirmation, or delegation changes afterward. The full tree is revealed to all members.
- The stamp is graded by un-confirmed share of the whole (see Context 03, check 5).
- The locked record shows: the full tree with shares, the checks as they stood, the stamp, the locked-in timestamp, and (reverse mode) corrective actions.

## Reverse mode (RCCA) differences
- Root = a problem statement (what went wrong, when, what it cost). Sections = cause areas, each owned by the person closest to that area. Inputs = causes and contributing factors.
- Weights mean: "how much of why this happened does this cause explain?" Guiding question per cause: "If we fixed only this, how much of the problem goes away?"
- Evidence kinds use the reverse labels above; a cause should be tagged for how it is known before it is weighted.
- Expected areas: an item may carry a list of stakeholder areas that should be covered; an expected area with no section triggers the blind-spot check (Context 03).
- **Corrective actions:** after lock-in, an action note (text, owner, due date) can be attached to any cause. The record shows: "Actions address X% of the explanation" = the sum of shares of causes carrying an action.

## Items, groups, timestamps
- Every item stores: created-at, last-edited-at (any change), locked-in-at (nullable).
- Every item carries one free-text **Group** tag (set at creation, editable by the item owner). Items are listed grouped by this tag.
- A **library** view lists all items the user can access, grouped by tag, searchable by title / owner / group, filterable by mode, status (In progress / Final / Final — draft), and date.

## Item creation
- Creator provides: title, mode, 2–6 sections (name + owner each), optional group tag, and (reverse) optional expected-areas list.
- Sections start at equal shares (100 ÷ n). Each new section starts with two starter inputs at 50/50, tagged opinion (forward) / opinion-reverse-label (reverse), all un-confirmed, item unlocked.
