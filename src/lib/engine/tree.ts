import type { EvidenceKind, NodeRow } from "@/lib/types";

export type TreeNode = {
  id: string;
  parent_id: string | null;
  label: string;
  kind: EvidenceKind;
  local_weight: number;
  owner_id: string | null;
  delegated_from: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  sort_order: number;
  share_of_whole: number;
  children: TreeNode[];
};

export function buildTree(rows: NodeRow[]): TreeNode[] {
  const byParent = new Map<string | null, NodeRow[]>();
  for (const row of rows) {
    const key = row.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  function walk(parentId: string | null, parentShare: number): TreeNode[] {
    const kids = byParent.get(parentId) ?? [];
    return kids.map((row) => {
      const share = (parentShare * Number(row.local_weight)) / 100;
      return {
        id: row.id,
        parent_id: row.parent_id,
        label: row.label,
        kind: row.kind,
        local_weight: Number(row.local_weight),
        owner_id: row.owner_id,
        delegated_from: row.delegated_from,
        confirmed: row.confirmed,
        confirmed_at: row.confirmed_at,
        sort_order: row.sort_order,
        share_of_whole: share,
        children: walk(row.id, share),
      };
    });
  }

  return walk(null, 100);
}

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(list: TreeNode[]) {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

export function leavesOf(nodes: TreeNode[]): TreeNode[] {
  return flattenTree(nodes).filter((n) => n.children.length === 0);
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** Path labels from root section down to this node (inclusive). */
export function pathLabels(nodes: TreeNode[], nodeId: string): string[] {
  const map = new Map(flattenTree(nodes).map((n) => [n.id, n]));
  const node = map.get(nodeId);
  if (!node) return [];
  const path: string[] = [];
  let cur: TreeNode | undefined = node;
  while (cur) {
    path.unshift(cur.label);
    cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
  }
  return path;
}

export function childrenOf(
  rows: NodeRow[],
  parentId: string | null,
): NodeRow[] {
  return rows
    .filter((r) => r.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
