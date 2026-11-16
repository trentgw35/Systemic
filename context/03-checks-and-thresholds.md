# Systemic — Checks and Thresholds, v2 (Context 03)

The "Things to check" panel is computed from the fixed rules below — deterministic arithmetic over the tree, never AI inference. Thresholds v2 were adopted 2026-11-14 after a pressure test against two worked examples; implement them exactly. Percentages are shares of the whole (effective weights), computed over leaf nodes unless stated otherwise.

## Forward mode (decisions)

1. **Mostly personal opinion**
   - Fires when opinion-kind leaves total **> 50%**.
   - **Borderline** state when the total is **45–50%** (a third panel state, between firing and OK).
   - Title: "Mostly personal opinion". Detail: "More than half of this decision rests on personal opinion rather than evidence or analysis."

2. **Heavy weight, light evidence**
   - Fires when **either**: (a) any single opinion- or anecdote-kind leaf is **≥ 5%**, **or** (b) any one person's opinion + anecdote leaves sum to **≥ 10%** (per-person subtotal — this stops the check from rewarding shallow trees and punishing thorough breakdowns).
   - Title: "Heavy weight, light evidence". When (b) triggers, the detail names the person and figure: "{Person}'s opinion-based inputs add up to {X}% of this decision."

3. **One person holds outsized weight**
   - Fires when the top person's total share is **> 35% AND ≥ 1.5× the second person's total**. (Relative, not absolute: a balanced 40/40 two-lead structure must NOT fire.)
   - A "person's total" = the sum of shares of all leaves in sections that person owns (including delegated sections they currently own).
   - Title: "One person holds outsized weight". Detail: "{Person}'s inputs total {X}% of this decision — more than 1.5× the next person's share."

4. **Very little data underneath**
   - Fires when data-kind leaves total **< 15%**. Unchanged from v1.
   - Known watch item (do not engineer around it yet): a single token data input can clear this check; revisit with pilot evidence.
   - Title: "Very little data underneath".

5. **Sections still unconfirmed**
   - Fires when the un-confirmed share is **> 10%**.
   - Title: "Sections still unconfirmed".
   - **Graded lock-in stamp** (uses the same un-confirmed share at lock-in):
     - ≤ 10% un-confirmed → "Final — all sections confirmed"
     - > 10% and ≤ 25% → "Final — {confirmed}% confirmed" (confirmed share, whole percent)
     - > 25% → "Final — draft (sections unconfirmed)"

## Reverse mode (RCCA / problems)

1. **One area carries most of the explanation** — top Level-1 section **> 35% AND ≥ 1.5× the second section**. Detail: "{Area} accounts for {X}% — more than 1.5× the next area's share."
2. **Leading cause not verified** — fires when the highest-share leaf is kind opinion or anecdote, **or** when any one section owner's opinion + anecdote causes sum to **≥ 10%** (detail names that section).
3. **Mostly suspicion** — opinion + anecdote leaves **> 50%**; **Borderline at 45–50%**.
4. **Very little verified** — data-kind leaves **< 15%**.
5. **Sections still unconfirmed** — un-confirmed share **> 10%**; lock-in stamp graded exactly as forward.
6. **Areas not yet looked at** (reverse only) — fires for each expected area (Context 02) that has no Level-1 section. Detail: "{Area} has no section in this analysis. An area with no section is a blind spot, not a zero." If the item has no expected-areas list, this check does not run.

## Panel behavior
- Each check shows one of three states: "Check" (firing), "Borderline" (only checks 1 forward / 3 reverse have a borderline band), or "OK".
- When nothing fires and nothing is borderline, the panel shows a clear state ("Looks good" is acceptable copy for the all-clear line — keep the register of Context 01).
- Checks recompute live on every change, in both modes, per item.

## Worked examples (use as acceptance fixtures)
- Forward example "Which social media platform to advertise on? → Instagram": Level-1 CEO 40 / CMO 40 / CFO 10 / CTO 10; ≈60% personal opinion; ≈11.3% data & analysis; the deepest leaf ("Opinions of his children") ≈1.9%. Expected at seed: checks 1, 2, 4, 5 fire; check 3 does NOT fire (40 vs 40); with the CEO's section un-confirmed (40%), a lock-in stamps "Final — draft (sections unconfirmed)".
- Reverse example "Fleet delivery for the Q3 launch slipped three weeks": Supply 45 (vendor overcommitment 60% → 27% of whole; late PO acknowledgments 40% → 18%), Planning 30 (forecast too optimistic 70% → 21%; no slack 30% → 9%), Engineering 15 (late spec change), Logistics 10 (carrier delay); Planning un-confirmed at seed; expected areas include Quality, which has no section. Expected at seed: checks 1 (45 vs 30 = exactly 1.5×, fires), 5, 6 fire; suspicion share 31%; verified share 69%; corrective actions on the top four causes cover 81% of the explanation.
