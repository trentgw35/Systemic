# MILESTONE 2 — Engine core: items, sections, coupled sliders, confirmation, masking

Implement Context 02's core mechanics for decision-mode items (RCCA specifics arrive in Milestone 4; build the shared engine so mode is a data attribute, not a fork):

- Item creation per Context 02: title, optional group tag, 2–6 sections (name + owner), equal section shares, two starter inputs per section at 50/50 tagged opinion, all un-confirmed.
- "Your section" view (mobile-first): for each children-set the signed-in user owns — coupled sliders with lock/pin, proportional redistribution, local share + live share-of-the-whole per input, context chip (path from root + section's share), and the "Confirm this section" control with Confirmed / Not yet confirmed state.
- Server endpoints enforce: only the set's owner can read its content pre-lock-in, change weights, or confirm; any weight change in a confirmed set un-confirms it; every mutation revalidates sum-to-100 in the same transaction.
- Stats strip (server-computed over the full tree, visible to all item members): "Rests on personal opinion", "Based on data & analysis", "Confirmed so far", "Total check", "Status: In progress".
- "Full picture" panel with masking per Context 02/04: own sections in full; others as bare "Hidden until the decision is locked in" rows; aggregate stats only.
- Item header shows created / last-edited timestamps per Context 02.

## Acceptance checks
1. Create a decision with 3 sections: shares are equal thirds summing to 100; each section has two 50/50 starter inputs; all sets un-confirmed.
2. As a section owner, drag one input's slider: siblings renormalize proportionally, the set still sums to exactly 100, and the input's share-of-the-whole updates live. Pin a sibling and drag again: the pinned value does not move.
3. Confirm a section: "Confirmed so far" rises by that section's share. Edit a weight in it: it flips back to Not yet confirmed and the stat falls.
4. As a different member, open the same item: the first user's section content is absent from the API response (verify at the network level, not just the rendered page); you see your own section, the chip, and the stats.
5. The forward worked example (Context 03) reproduces its seed stats: ≈60% personal opinion, ≈11.3% data & analysis.
Report per the master prompt's format.
