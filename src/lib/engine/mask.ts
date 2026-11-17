import type { TreeNode } from "./tree";

export type MaskedNode =
  | {
      kind: "visible";
      id: string;
      parent_id: string | null;
      label: string;
      evidence_kind: TreeNode["kind"];
      local_weight: number;
      owner_id: string | null;
      delegated_from: string | null;
      confirmed: boolean;
      share_of_whole: number;
      children: MaskedNode[];
      editable: boolean;
      delegated_to_name?: string | null;
      waiting_on_name?: string | null;
    }
  | {
      kind: "hidden";
      id: string;
      share_of_whole: number | null;
    };

export function maskTreeForViewer(
  tree: TreeNode[],
  viewerId: string,
  locked: boolean,
  nameById: Map<string, string> = new Map(),
): MaskedNode[] {
  if (locked) {
    return tree.map((n) => visibleDeep(n, viewerId, nameById));
  }

  return tree.map((section) => {
    if (section.owner_id === viewerId) {
      return visibleDeep(section, viewerId, nameById);
    }
    if (ownsAnyDescendantSet(section, viewerId)) {
      return partialForDelegatee(section, viewerId, nameById);
    }
    return {
      kind: "hidden" as const,
      id: section.id,
      share_of_whole: null,
    };
  });
}

function ownsAnyDescendantSet(node: TreeNode, viewerId: string): boolean {
  if (node.owner_id === viewerId && node.children.length > 0) return true;
  return node.children.some((c) => ownsAnyDescendantSet(c, viewerId));
}

function onPathToOwned(node: TreeNode, viewerId: string): boolean {
  if (node.owner_id === viewerId && node.children.length > 0) return true;
  return node.children.some((c) => onPathToOwned(c, viewerId));
}

/** Show only the path to owned sets; other branches stay hidden. */
function partialForDelegatee(
  node: TreeNode,
  viewerId: string,
  nameById: Map<string, string>,
): MaskedNode {
  if (node.owner_id === viewerId && node.children.length > 0) {
    return visibleDeep(node, viewerId, nameById);
  }
  return {
    kind: "visible",
    id: node.id,
    parent_id: node.parent_id,
    label: node.label,
    evidence_kind: node.kind,
    local_weight: node.local_weight,
    owner_id: node.owner_id,
    delegated_from: node.delegated_from,
    confirmed: node.confirmed,
    share_of_whole: node.share_of_whole,
    editable: false,
    children: node.children.map((c) => {
      if (onPathToOwned(c, viewerId)) {
        return partialForDelegatee(c, viewerId, nameById);
      }
      return { kind: "hidden" as const, id: c.id, share_of_whole: null };
    }),
  };
}

function visibleDeep(
  node: TreeNode,
  viewerId: string,
  nameById: Map<string, string>,
): MaskedNode {
  const delegatedAway =
    Boolean(node.owner_id) &&
    node.owner_id !== viewerId &&
    node.children.length > 0 &&
    Boolean(node.delegated_from);

  const delegatedToName =
    delegatedAway && node.owner_id
      ? nameById.get(node.owner_id) ?? "member"
      : null;
  const waitingOnName =
    delegatedAway && !node.confirmed && node.owner_id
      ? nameById.get(node.owner_id) ?? "member"
      : null;

  return {
    kind: "visible",
    id: node.id,
    parent_id: node.parent_id,
    label: node.label,
    evidence_kind: node.kind,
    local_weight: node.local_weight,
    owner_id: node.owner_id,
    delegated_from: node.delegated_from,
    confirmed: node.confirmed,
    share_of_whole: node.share_of_whole,
    editable: node.owner_id === viewerId && node.children.length > 0,
    delegated_to_name: delegatedToName,
    waiting_on_name: waitingOnName,
    children: node.children.map((c) => visibleDeep(c, viewerId, nameById)),
  };
}

export type OwnedSetView = {
  parent: TreeNode;
  path: string[];
  share_of_whole: number;
  children: TreeNode[];
};

export function ownedSets(
  tree: TreeNode[],
  viewerId: string,
): OwnedSetView[] {
  const out: OwnedSetView[] = [];
  function walk(nodes: TreeNode[], path: string[]) {
    for (const n of nodes) {
      const nextPath = [...path, n.label];
      if (n.owner_id === viewerId && n.children.length > 0) {
        out.push({
          parent: n,
          path: nextPath,
          share_of_whole: n.share_of_whole,
          children: n.children,
        });
      }
      if (n.children.length) walk(n.children, nextPath);
    }
  }
  walk(tree, []);
  return out;
}
