# Systemic — Product Brief (Context 01)

## What Systemic does
Make the decision together. Systemic maps what's underneath it, so nothing important stays hidden — and it remembers why you made the call.

## The product
Collaborators jointly break an important decision into weighted lower-order inputs, organized as a tree. Each person owns one branch of the tree and builds only their part. The system composes the full tree, computes how much each input actually counts toward the whole decision, flags weak spots (over-reliance on personal opinion, one voice dominating, thin evidence), and freezes the result as a permanent record of why the decision was made — its provenance.

The same engine runs in reverse as an RCCA tool (root cause / corrective action): start from a problem — what went wrong — gather weighted cause inputs from the people closest to it, and produce a ranked root-cause record with corrective actions attached to the top causes.

## First users
Planning and operations teams who sit at the intersection of many stakeholders and executives (SIOP / operations planning orgs). Their recurring decision cadence is the distribution channel. Launch motion: a team's first map is built live in a real decision meeting, then refined asynchronously.

## Core loop
1. **Frame** — a Decision Owner states the decision (or, in reverse, the problem) and names the top-level sections and their owners.
2. **Draft** — each section starts as a draft (later: AI-drafted from a document or transcript; in the MVP, starter inputs the owner reshapes). Drafts are visibly un-confirmed.
3. **Own your branch** — each contributor sees only their own section, plus a context chip (path from the root, and their section's share of the whole). They adjust coupled sliders that always sum to 100 within their section, reshape the section's structure, and confirm it.
4. **Compose and check** — the system rolls all weights up to the root, computes each input's share of the whole, and runs the deterministic checks (see Context 03).
5. **Lock in** — the record freezes with a graded confirmation stamp. After lock-in, the full tree is revealed to everyone and the record is read-only.

## Design principles (non-negotiable)
- **Ease is the feature.** Contributors spend their time deciding, not mapping. Target admin budget: ≤10 minutes per contributor, zero for non-owners.
- **Nobody maps what isn't theirs.** A contributor only ever builds their own branch.
- **AI proposes, humans dispose.** AI-generated content is always labeled un-confirmed until the owning human confirms or overwrites it. Overwriting must be a gesture, not a form.
- **Confirmation is forever visible.** Every section carries its confirmation state into the final record.
- **Privacy until lock-in.** Contributors cannot see other sections' content before the record locks. They see only their context chip.
- **The checks are arithmetic, not AI.** The "Things to check" panel is computed from fixed rules (Context 03). This is deliberate: a flag a user can recompute by hand is trustworthy in a way a model's opinion is not.

## Copy register (non-negotiable)
Customer-facing language sits in a middle register: plain, professional, some gravity. No internal jargon; not overly warm or cute. Use exactly these terms:
- Confirm (a section) — button: "Confirm this section"; states: "Confirmed" / "Not yet confirmed"
- Lock in — button: "Lock in the decision" (forward) / "Lock in the record" (reverse)
- Lock-in stamps: "Final — all sections confirmed" / "Final — {X}% confirmed" / "Final — draft (sections unconfirmed)"; before lock-in: "In progress"
- Checks panel title: "Things to check"; states: "Check" (firing) / "Borderline" / "OK"
- Panels: "Your section" / "Full picture"
- Hidden sections: "Hidden until the decision is locked in"
- Stats labels: "Rests on personal opinion" (forward) / "Rests on suspicion" (reverse); "Based on data & analysis" (forward) / "Verified in records" (reverse); "Confirmed so far"; "Total check"; "Status"
- Never use in UI copy: attest/attestation, freeze (as a verb for lock-in), flag (as a noun for a check), effective weight, leaves. Say "share of the whole decision" / "share of the whole problem".
