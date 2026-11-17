import type { EvidenceKind, ItemMode } from "@/lib/types";

const FORWARD: Record<EvidenceKind, string> = {
  opinion: "Personal opinion",
  anecdote: "Anecdotal evidence",
  advisory: "Trusted advisors",
  data: "Data & analysis",
  process: "Detailed breakdown",
};

const REVERSE: Record<EvidenceKind, string> = {
  opinion: "Suspected, unverified",
  anecdote: "Reported, not checked",
  advisory: "Expert assessment",
  data: "Verified in records",
  process: "Detailed breakdown",
};

export function evidenceLabel(kind: EvidenceKind, mode: ItemMode): string {
  return mode === "rcca" ? REVERSE[kind] : FORWARD[kind];
}
