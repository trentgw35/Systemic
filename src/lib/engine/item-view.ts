import type { Item, NodeRow } from "@/lib/types";
import {
  computeChecks,
  confirmationsList,
  type ChecksSnapshot,
} from "./checks";
import { computeStats, statsLabels } from "./stats";
import { maskTreeForViewer, ownedSets, type MaskedNode } from "./mask";
import { buildTree, pathLabels, type TreeNode } from "./tree";

export type ActionNoteView = {
  id: string;
  node_id: string;
  node_label: string;
  text: string;
  owner_name: string;
  due_date: string | null;
  share_of_whole: number;
};

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
    expected_areas: string[] | null;
  };
  viewer_is_item_owner: boolean;
  members: Array<{ id: string; name: string; email: string }>;
  stats: ReturnType<typeof computeStats>;
  stats_labels: ReturnType<typeof statsLabels>;
  checks: ChecksSnapshot;
  confirmations: ReturnType<typeof confirmationsList>;
  actions: ActionNoteView[];
  actions_coverage_pct: number | null;
  tree: MaskedNode[];
  your_sections: Array<{
    parent_id: string;
    label: string;
    path: string[];
    share_of_whole: number;
    confirmed: boolean;
    delegated_from: string | null;
    children: Array<{
      id: string;
      label: string;
      evidence_kind: NodeRow["kind"];
      local_weight: number;
      share_of_whole: number;
      has_children: boolean;
      owner_id: string | null;
      delegated_from: string | null;
      confirmed: boolean;
      delegated_to_name: string | null;
      waiting_on_name: string | null;
    }>;
  }>;
};

export function buildItemView(
  item: Item,
  rows: NodeRow[],
  viewerId: string,
  nameById: Map<string, string> = new Map(),
  members: Array<{ id: string; name: string; email: string }> = [],
  actionNotes: Array<{
    id: string;
    node_id: string;
    text: string;
    owner_name: string;
    due_date: string | null;
  }> = [],
): ItemViewResponse {
  const tree = buildTree(rows);
  const locked = Boolean(item.locked_at);
  const stats = computeStats(tree, item.mode, item.locked_at, item.lock_stamp);
  const masked = maskTreeForViewer(tree, viewerId, locked, nameById);
  const owned = ownedSets(tree, viewerId);
  const flat = (() => {
    const out: TreeNode[] = [];
    function walk(list: TreeNode[]) {
      for (const n of list) {
        out.push(n);
        walk(n.children);
      }
    }
    walk(tree);
    return out;
  })();
  const byId = new Map(flat.map((n) => [n.id, n]));

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

  const actions: ActionNoteView[] = actionNotes.map((a) => {
    const node = byId.get(a.node_id);
    return {
      id: a.id,
      node_id: a.node_id,
      node_label: node?.label ?? "Cause",
      text: a.text,
      owner_name: a.owner_name,
      due_date: a.due_date,
      share_of_whole: node?.share_of_whole ?? 0,
    };
  });

  let actions_coverage_pct: number | null = null;
  if (item.mode === "rcca" && locked) {
    // Coverage = sum of shares of nodes that carry an action
    const seen = new Set<string>();
    let sum = 0;
    for (const a of actionNotes) {
      if (seen.has(a.node_id)) continue;
      seen.add(a.node_id);
      sum += byId.get(a.node_id)?.share_of_whole ?? 0;
    }
    actions_coverage_pct = Number(sum.toFixed(1));
  }

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
      expected_areas: item.expected_areas,
    },
    viewer_is_item_owner: item.created_by === viewerId,
    members,
    stats,
    stats_labels: statsLabels(item.mode),
    checks,
    confirmations,
    actions,
    actions_coverage_pct,
    tree: masked,
    your_sections: owned.map((s) => ({
      parent_id: s.parent.id,
      label: s.parent.label,
      path: s.path,
      share_of_whole: s.share_of_whole,
      confirmed: s.parent.confirmed,
      delegated_from: s.parent.delegated_from,
      children: s.children.map((c) => {
        const delegatedAway =
          Boolean(c.owner_id) &&
          c.owner_id !== viewerId &&
          c.children.length > 0 &&
          Boolean(c.delegated_from);
        return {
          id: c.id,
          label: c.label,
          evidence_kind: c.kind,
          local_weight: c.local_weight,
          share_of_whole: c.share_of_whole,
          has_children: c.children.length > 0,
          owner_id: c.owner_id,
          delegated_from: c.delegated_from,
          confirmed: c.confirmed,
          delegated_to_name:
            delegatedAway && c.owner_id
              ? nameById.get(c.owner_id) ?? "member"
              : null,
          waiting_on_name:
            delegatedAway && !c.confirmed && c.owner_id
              ? nameById.get(c.owner_id) ?? "member"
              : null,
        };
      }),
    })),
  };
}

export function assertTree(rows: NodeRow[]): TreeNode[] {
  return buildTree(rows);
}

export { pathLabels };
