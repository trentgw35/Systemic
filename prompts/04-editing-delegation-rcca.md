# MILESTONE 4 — Structural editing, delegation, and RCCA mode

Add the remaining engine behaviors from Context 02, in both modes:

- Structural editing (owner-only, pre-lock-in): add input (10% rule; 50/50 with a single sibling), remove input with sub-tree (proportional redistribution), rename, change evidence tag, break down a leaf (two 50/50 starters, tag carried, parent becomes Detailed breakdown). Item owner: add/remove Level-1 sections and assign owners. Every structural change un-confirms the edited set; the server enforces sum-to-100 and ownership.
- Delegation per Context 02: delegate control + member picker; leaf delegation breaks down first; existing sub-trees transfer ownership unchanged and become un-confirmed; delegator markers ("Delegated to {name}", "Waiting on {name}"); delegator blocked from editing/confirming the set (server-side); take-back restores ownership with content intact; chains to any depth; self-delegation refused; all controls disabled post-lock-in.
- RCCA mode end-to-end: problem-statement root; reverse evidence labels (Context 02); reverse stats labels ("Rests on suspicion", "Verified in records"); the six reverse checks from Context 03 including the relative area-dominance rule, the per-owner subtotal trigger on "Leading cause not verified", the borderline band on "Mostly suspicion", and the expected-areas blind-spot check; optional expected-areas list at creation; graded lock-in identical to forward.
- Corrective actions (rcca, post-lock-in): attach an action note (text, owner, due date) to any cause; the record header shows "Actions address X% of the explanation", computed live from the shares of causes carrying actions.

## Acceptance checks
1. In a confirmed section, add an input: it enters at 10%, siblings scale proportionally, the set sums to 100, and the section is now Not yet confirmed. Remove it: weights return to their prior values.
2. Delegate a leaf to another member: it becomes a breakdown with two 50/50 starters; the delegatee sees it in their view with the correct context chip and share; the delegator's attempts to edit or confirm it are refused by the server; after the delegatee confirms, the confirmed share includes that part's weight.
3. Take back the delegation: ownership returns, the delegatee's weights and labels are unchanged. Delegate a sub-input one level further (chain) and confirm the chain works.
4. RCCA worked example at seed: checks 1, 5, 6 fire; check 1's detail names Supply at 45%; suspicion 31%, verified 69%. Add the missing Quality section as Facilitator: check 6 clears.
5. Lock the RCCA example and attach actions to the top four causes: the coverage line reads 81%.
Report per the master prompt's format.
