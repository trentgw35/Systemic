# MILESTONE 3 — Checks, lock-in, and the record

Implement Context 03 exactly, plus the Full Picture's interactive tree:

- "Things to check" panel: the five forward checks with the exact v2 thresholds, the three states (Check / Borderline / OK), titles and detail copy per Context 03, recomputed live on every change. No AI anywhere in this path.
- Lock-in: the item owner locks the item in a single transaction — stamps locked-at and the graded stamp text per Context 03 check 5, reveals the full tree to all workspace members, and makes the item read-only.
- The record view (post-lock-in): full tree, checks as they stood at lock-in, stamp, timestamps, and who confirmed what.
- Full Picture interactive tree (both pre- and post-lock-in, respecting masking): one primary badge per node = its share of the whole; local share as small muted text; a thin proportional share bar under each label; siblings ordered largest-first in the Full Picture only (contributor views keep owner order); collapsible sections (deeper levels start collapsed on narrow screens); a Focus mode that re-roots the panel at a section with a breadcrumb of ancestor labels + shares and a "Back to full picture" return. Hidden sections expose no label, percentage, bar, or control pre-lock-in and cannot be focused.

## Acceptance checks
1. Forward worked example at seed: checks 1, 2, 4, 5 show "Check"; check 3 shows "OK" (40 vs 40 must not fire); opinion stat ≈60%.
2. Drag the CEO section's weight down so opinion share lands at 47–48%: check 1 shows "Borderline".
3. Make one person's opinion subtotal cross 10% with no single opinion leaf ≥5%: check 2 fires and its detail names that person and the percentage.
4. Lock in the seed example (CEO section un-confirmed at 40%): stamp reads "Final — draft (sections unconfirmed)". Confirm everything and lock a copy: "Final — all sections confirmed". Arrange 20% un-confirmed and lock a copy: "Final — 80% confirmed".
5. After lock-in, all members can read the full tree; every mutation endpoint refuses changes.
6. Focus on a mid-level section: breadcrumb shares match the tree math; return restores the full view. Pre-lock-in, another member's section cannot be focused or expanded.
Report per the master prompt's format.
