import type { ItemMode } from "@/lib/types";
import { flattenTree, leavesOf, type TreeNode } from "./tree";

export type ItemStats = {
  personal_opinion_pct: number;
  data_analysis_pct: number;
  confirmed_so_far_pct: number;
  total_check_pct: number;
  status: "In progress" | string;
  /** Internal / network-visible aggregates used by acceptance */
  opinion_leaf_pct: number;
  data_leaf_pct: number;
};

function round1(n: number) {
  return Number(n.toFixed(1));
}

/**
 * Confirmed share = share-of-the-whole of confirmed children-sets,
 * skipping a set if an ancestor children-set is already confirmed
 * (avoids double-counting nested confirms).
 */
export function confirmedSharePct(tree: TreeNode[]): number {
  const flat = flattenTree(tree);
  const confirmedSets = flat.filter((n) => n.confirmed && n.children.length > 0);
  const confirmedIds = new Set(confirmedSets.map((n) => n.id));
  const byId = new Map(flat.map((n) => [n.id, n]));

  let sum = 0;
  for (const n of confirmedSets) {
    let ancestorConfirmed = false;
    let parentId = n.parent_id;
    while (parentId) {
      if (confirmedIds.has(parentId)) {
        ancestorConfirmed = true;
        break;
      }
      parentId = byId.get(parentId)?.parent_id ?? null;
    }
    if (!ancestorConfirmed) sum += n.share_of_whole;
  }
  return sum;
}

export function computeStats(
  tree: TreeNode[],
  mode: ItemMode,
  lockedAt: string | null,
  lockStamp: string | null,
): ItemStats {
  const leaves = leavesOf(tree);
  const opinion = leaves
    .filter((l) => l.kind === "opinion")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const data = leaves
    .filter((l) => l.kind === "data")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const total = leaves.reduce((s, l) => s + l.share_of_whole, 0);
  const confirmed = confirmedSharePct(tree);

  void mode;
  return {
    personal_opinion_pct: round1(opinion),
    data_analysis_pct: round1(data),
    confirmed_so_far_pct: round1(confirmed),
    total_check_pct: round1(total),
    status: lockedAt ? lockStamp ?? "Final" : "In progress",
    opinion_leaf_pct: opinion,
    data_leaf_pct: data,
  };
}

export function statsLabels(mode: ItemMode) {
  if (mode === "rcca") {
    return {
      opinion: "Rests on suspicion",
      data: "Verified in records",
      confirmed: "Confirmed so far",
      total: "Total check",
      status: "Status",
      whole: "Of the whole problem",
      local: "Within your section",
    };
  }
  return {
    opinion: "Rests on personal opinion",
    data: "Based on data & analysis",
    confirmed: "Confirmed so far",
    total: "Total check",
    status: "Status",
    whole: "Of the whole decision",
    local: "Within your section",
  };
}
