import type { EvidenceKind, NodeRow } from "@/lib/types";
import { weightsAfterAdd, weightsAfterRemove } from "./weights";
import { childrenOf } from "./tree";

export function newId() {
  return crypto.randomUUID();
}

export type StructureMutation = {
  upsert: NodeRow[];
  removeIds: string[];
  unconfirmParentIds: string[];
};

function asRow(
  partial: Omit<NodeRow, "created_at"> & { created_at?: string },
): NodeRow {
  return {
    created_at: partial.created_at ?? new Date().toISOString(),
    ...partial,
  };
}

/** Plan adding an input under parentId (null = Level-1). */
export function planAddInput(
  rows: NodeRow[],
  itemId: string,
  parentId: string | null,
  label: string,
  kind: EvidenceKind,
  ownerId: string | null,
): { mutation: StructureMutation; newNodeId: string } {
  const siblings = childrenOf(rows, parentId);
  const id = newId();
  const planned = weightsAfterAdd(
    siblings.map((s) => ({ id: s.id, local_weight: Number(s.local_weight) })),
    id,
  );
  const byId = new Map(planned.map((p) => [p.id, p.local_weight]));
  const upsert: NodeRow[] = siblings.map((s) =>
    asRow({ ...s, local_weight: byId.get(s.id) ?? s.local_weight }),
  );
  upsert.push(
    asRow({
      id,
      item_id: itemId,
      parent_id: parentId,
      label,
      kind,
      local_weight: byId.get(id) ?? 10,
      owner_id: ownerId,
      delegated_from: null,
      confirmed: false,
      confirmed_at: null,
      sort_order: siblings.length,
    }),
  );
  return {
    newNodeId: id,
    mutation: {
      upsert,
      removeIds: [],
      unconfirmParentIds: parentId ? [parentId] : [],
    },
  };
}

export function planRemoveInput(
  rows: NodeRow[],
  nodeId: string,
): StructureMutation {
  const node = rows.find((r) => r.id === nodeId);
  if (!node) throw new Error("Node not found");
  const siblings = childrenOf(rows, node.parent_id);
  const planned = weightsAfterRemove(
    siblings.map((s) => ({ id: s.id, local_weight: Number(s.local_weight) })),
    nodeId,
  );
  const byId = new Map(planned.map((p) => [p.id, p.local_weight]));
  const upsert = siblings
    .filter((s) => s.id !== nodeId)
    .map((s) => asRow({ ...s, local_weight: byId.get(s.id) ?? s.local_weight }));

  // Collect subtree ids to delete
  const removeIds: string[] = [];
  function collect(id: string) {
    removeIds.push(id);
    for (const c of childrenOf(rows, id)) collect(c.id);
  }
  collect(nodeId);

  return {
    upsert,
    removeIds,
    unconfirmParentIds: node.parent_id ? [node.parent_id] : [],
  };
}

export function planBreakDown(
  rows: NodeRow[],
  nodeId: string,
  ownerId: string,
): StructureMutation {
  const node = rows.find((r) => r.id === nodeId);
  if (!node) throw new Error("Node not found");
  if (childrenOf(rows, nodeId).length > 0) {
    throw new Error("Only a leaf can be broken down");
  }
  const carried = node.kind;
  const a = newId();
  const b = newId();
  const parent = asRow({
    ...node,
    kind: "process",
    owner_id: ownerId,
    confirmed: false,
    confirmed_at: null,
  });
  const starters: NodeRow[] = [
    asRow({
      id: a,
      item_id: node.item_id,
      parent_id: nodeId,
      label: "Starter input A",
      kind: carried === "process" ? "opinion" : carried,
      local_weight: 50,
      owner_id: null,
      delegated_from: null,
      confirmed: false,
      confirmed_at: null,
      sort_order: 0,
    }),
    asRow({
      id: b,
      item_id: node.item_id,
      parent_id: nodeId,
      label: "Starter input B",
      kind: carried === "process" ? "opinion" : carried,
      local_weight: 50,
      owner_id: null,
      delegated_from: null,
      confirmed: false,
      confirmed_at: null,
      sort_order: 1,
    }),
  ];
  return {
    upsert: [parent, ...starters],
    removeIds: [],
    unconfirmParentIds: node.parent_id ? [node.parent_id, nodeId] : [nodeId],
  };
}
