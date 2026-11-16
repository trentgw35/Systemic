# Systemic — The AI Layer (Context 05)

## The rule
The checks ("Things to check", Context 03) are deterministic rules computed from the tree. They are **never** generated, adjusted, or reworded by an AI model. A short note to this effect belongs in the product near the checks panel: the checks are fixed rules calculated from the tree; the AI features below are separate and clearly labeled.

## Where AI belongs (build behind a provider adapter)
1. **AI-drafted trees.** Given source material (a meeting brief, document text, or transcript pasted/uploaded by the item owner), the AI proposes a draft decomposition: sections, inputs, evidence kinds, and starting weights. Every AI-drafted node enters the tree visibly un-confirmed, and the owning human confirms or overwrites it (Context 01: AI proposes, humans dispose). Drafting is an assist at item creation and inside a section ("draft my section from these notes"); it never confirms anything and never changes a confirmed set without un-confirming it (Context 02 rules apply to AI edits exactly as to human edits).
2. **Narrative interpretation.** Optionally, per fired check, a short plain-language note on why it may matter for this specific item and what evidence would settle it. It must be visually distinct from the check itself and labeled as interpretation. It never changes a check's state, threshold, or wording.

## Provider configuration (required design)
- All AI calls go through a single adapter interface (e.g., `AIProvider.draftTree(...)`, `AIProvider.interpret(...)`) so the model can be swapped without touching product code.
- Provider, model name, and API key are configuration (environment variables / admin settings), never hard-coded. The product must run fully — all non-AI features — with no AI provider configured.
- Log which provider/model produced each draft (provenance applies to AI output too), and store the draft's source material reference with the item.
- Do not send one workspace's data to a provider configured by another workspace; provider config is per-deployment for the MVP, per-workspace later.

## Sequencing
The AI layer is NOT required for the first hosted build's core milestones (auth, engine, checks, records). Build the adapter interface and a stub in the scaffold milestone; implement drafting and interpretation as the final milestone, behind a feature flag, once the deterministic core is verified.
