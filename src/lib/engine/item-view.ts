import type { Item, NodeRow } from "@/lib/types";
import {
  computeChecks,
  confirmationsList,
  type ChecksSnapshot,
} from "./checks";
import { computeStats, statsLabels } from "./stats";
import { maskTreeForViewer, ownedSets, type MaskedNode } from "./mask";
import { buildTree, pathLabels, type TreeNode } from "./tree";

export type ItemViewResponse = {
  item: {
    id: string;
    workspace_id: string;
    mode: Item["mode"];
    title: string;
    group_tag: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    locked_at: string | null;
    lock_stamp: string | null;
  };
  viewer_is_item_owner: boolean;
  stats: ReturnType<typeof computeStats>;
  stats_labels: ReturnType<typeof statsLabels>;
  checks: ChecksSnapshot;
  confirmations: ReturnType<typeof confirmationsList>;
  /** Masked tree for Full picture */
  tree: MaskedNode[];
  /** Own editable sets for Your section */
  your_sections: Array<{
    parent_id: string;
    label: string;
    path: string[];
    share_of_whole: number;
    confirmed: boolean;
    children: Array<{
      id: string;
      label: string;
      evidence_kind: NodeRow["kind"];
      local_weight: number;
      share_of_whole: number;
      has_children: boolean;
    }>;
  }>;
};

export function buildItemView(
  item: Item,
  rows: NodeRow[],
  viewerId: string,
  nameById: Map<string, string> = new Map(),
): ItemViewResponse {
  const tree = buildTree(rows);
  const locked = Boolean(item.locked_at);
  const stats = computeStats(tree, item.mode, item.locked_at, item.lock_stamp);
  const masked = maskTreeForViewer(tree, viewerId, locked);
  const owned = ownedSets(tree, viewerId);

  const liveChecks = computeChecks(
    tree,
    item.mode,
    nameById,
    item.expected_areas,
  );
  const checks =
    locked && item.checks_snapshot
      ? (item.checks_snapshot as ChecksSnapshot)
      : liveChecks;

  const confirmations =
    locked && item.confirmations_snapshot
      ? (item.confirmations_snapshot as ReturnType<typeof confirmationsList>)
      : confirmationsList(tree, nameById);

  return {
    item: {
      id: item.id,
      workspace_id: item.workspace_id,
      mode: item.mode,
      title: item.title,
      group_tag: item.group_tag,
      created_by: item.created_by,
      created_at: item.created_at,
      updated_at: item.updated_at,
      locked_at: item.locked_at,
      lock_stamp: item.lock_stamp,
    },
    viewer_is_item_owner: item.created_by === viewerId,
    stats,
    stats_labels: statsLabels(item.mode),
    checks,
    confirmations,
    tree: masked,
    your_sections: owned.map((s) => ({
      parent_id: s.parent.id,
      label: s.parent.label,
      path: s.path,
      share_of_whole: s.share_of_whole,
      confirmed: s.parent.confirmed,
      children: s.children.map((c) => ({
        id: c.id,
        label: c.label,
        evidence_kind: c.kind,
        local_weight: c.local_weight,
        share_of_whole: c.share_of_whole,
        has_children: c.children.length > 0,
      })),
    })),
  };
}

export function assertTree(rows: NodeRow[]): TreeNode[] {
  return buildTree(rows);
}

export { pathLabels };
