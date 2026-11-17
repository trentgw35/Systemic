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
      confirmed: boolean;
      share_of_whole: number;
      children: MaskedNode[];
      /** True when viewer owns this node's children-set */
      editable: boolean;
    }
  | {
      kind: "hidden";
      id: string;
      share_of_whole: number | null;
    };

/**
 * Pre-lock-in masking (Context 02/04): own sections (and descendants under
 * sets the viewer owns) in full; other Level-1 sections as bare placeholders.
 * Nested content under someone else's section is never included.
 */
export function maskTreeForViewer(
  tree: TreeNode[],
  viewerId: string,
  locked: boolean,
): MaskedNode[] {
  if (locked) {
    return tree.map((n) => visibleDeep(n, viewerId));
  }

  return tree.map((section) => {
    if (section.owner_id === viewerId) {
      return visibleDeep(section, viewerId);
    }
    // Section (or any nested set) owned by viewer via delegation deeper in tree
    if (ownsAnyDescendantSet(section, viewerId)) {
      return visibleDeep(section, viewerId);
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

function visibleDeep(node: TreeNode, viewerId: string): MaskedNode {
  // Pre-lock we only call this for owned branches. Nested delegated sets
  // owned by others appear for the parent owner but aren't editable (M04).
  return {
    kind: "visible",
    id: node.id,
    parent_id: node.parent_id,
    label: node.label,
    evidence_kind: node.kind,
    local_weight: node.local_weight,
    owner_id: node.owner_id,
    confirmed: node.confirmed,
    share_of_whole: node.share_of_whole,
    editable: node.owner_id === viewerId && node.children.length > 0,
    children: node.children.map((c) => {
      // If this child roots a set owned by someone else, show label+weight but
      // mark not editable; content of that set stays visible to the parent
      // owner until lock-in only if they own the parent set — Context 02:
      // "Other users' section content — labels, weights, structure — is hidden"
      // applies to other users' sections. Within your section you see structure
      // you built; delegated sets are M04.
      if (
        c.owner_id &&
        c.owner_id !== viewerId &&
        c.children.length > 0 &&
        node.owner_id === viewerId
      ) {
        // Parent owner sees delegated stub (M04); for M02 treat as visible leaf-like
        return {
          kind: "visible" as const,
          id: c.id,
          parent_id: c.parent_id,
          label: c.label,
          evidence_kind: c.kind,
          local_weight: c.local_weight,
          owner_id: c.owner_id,
          confirmed: c.confirmed,
          share_of_whole: c.share_of_whole,
          editable: false,
          children: c.children.map((gc) => visibleDeep(gc, viewerId)),
        };
      }
      return visibleDeep(c, viewerId);
    }),
  };
}

export type OwnedSetView = {
  parent: TreeNode;
  path: string[];
  share_of_whole: number;
  children: TreeNode[];
};

/** Children-sets the viewer currently owns (for "Your section"). */
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
