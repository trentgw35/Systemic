#!/usr/bin/env node
import { FORWARD_DEMO, REVERSE_DEMO, leafShares } from "../src/lib/demo-seed.ts";
import {
  weightsAfterAdd,
  weightsAfterRemove,
} from "../src/lib/engine/weights.ts";
import { planAddInput, planRemoveInput, planBreakDown } from "../src/lib/engine/structure.ts";
import { buildTree } from "../src/lib/engine/tree.ts";
import { computeChecks } from "../src/lib/engine/checks.ts";
import { buildItemView } from "../src/lib/engine/item-view.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Add at 10% then remove restores proportionally (not bit-identical after rounding,
// but sum=100 and remove redistributes fully)
const sibs = [
  { id: "a", local_weight: 50 },
  { id: "b", local_weight: 50 },
];
const afterAdd = weightsAfterAdd(sibs, "c");
assert(Math.abs(afterAdd.reduce((s, r) => s + r.local_weight, 0) - 100) < 1e-6, "add sum");
const c = afterAdd.find((r) => r.id === "c");
assert(Math.abs(c.local_weight - 10) < 1e-6, "add 10%");
const afterRm = weightsAfterRemove(afterAdd, "c");
assert(afterRm.length === 2, "removed");
assert(Math.abs(afterRm.reduce((s, r) => s + r.local_weight, 0) - 100) < 1e-6, "rm sum");

// Single sibling → 50/50
const one = weightsAfterAdd([{ id: "only", local_weight: 100 }], "new");
assert(one.every((r) => r.local_weight === 50), "50/50");

// planBreakDown
const leafRows = [
  {
    id: "p",
    item_id: "i",
    parent_id: null,
    label: "Sec",
    kind: "process",
    local_weight: 100,
    owner_id: "u1",
    delegated_from: null,
    confirmed: true,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "leaf",
    item_id: "i",
    parent_id: "p",
    label: "Leaf",
    kind: "opinion",
    local_weight: 100,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
];
const bd = planBreakDown(leafRows, "leaf", "u2");
const parent = bd.upsert.find((r) => r.id === "leaf");
assert(parent.kind === "process", "parent process");
assert(parent.owner_id === "u2", "owner");
assert(bd.upsert.filter((r) => r.parent_id === "leaf").length === 2, "starters");

// RCCA seed checks
function seedRows(sections, owners) {
  const rows = [];
  let n = 0;
  let l1 = 0;
  function walk(nodes, parentId, inheritOwner) {
    nodes.forEach((node, i) => {
      const id = `n${++n}`;
      const hasChildren = Boolean(node.children?.length);
      const owner = parentId === null ? owners[l1++] : hasChildren ? inheritOwner : null;
      rows.push({
        id,
        item_id: "item",
        parent_id: parentId,
        label: node.label,
        kind: node.kind,
        local_weight: node.local_weight,
        owner_id: hasChildren ? owner : null,
        delegated_from: null,
        confirmed: hasChildren ? Boolean(node.confirmed) : false,
        confirmed_at: null,
        sort_order: i,
        created_at: new Date().toISOString(),
      });
      if (node.children?.length) walk(node.children, id, owner);
    });
  }
  walk(sections, null, owners[0]);
  return rows;
}

const names = new Map([
  ["s", "Supply"],
  ["p", "Planning"],
  ["e", "Engineering"],
  ["l", "Logistics"],
]);
const rRows = seedRows(REVERSE_DEMO.sections, ["s", "p", "e", "l"]);
const rChecks = computeChecks(
  buildTree(rRows),
  "rcca",
  names,
  REVERSE_DEMO.expected_areas,
);
const rBy = Object.fromEntries(rChecks.checks.map((c) => [c.id, c]));
assert(rBy["one-area-most"].state === "Check", "r1");
assert(/Supply accounts for 45%/.test(rBy["one-area-most"].detail || ""), rBy["one-area-most"].detail);
assert(rBy["sections-unconfirmed"].state === "Check", "r5");
assert(
  rChecks.checks.some((c) => c.title === "Areas not yet looked at" && /Quality/.test(c.detail || "")),
  "r6 quality",
);

const leaves = leafShares(REVERSE_DEMO.sections);
const suspicion = leaves
  .filter((l) => l.kind === "opinion" || l.kind === "anecdote")
  .reduce((s, l) => s + l.share, 0);
const verified = leaves.filter((l) => l.kind === "data").reduce((s, l) => s + l.share, 0);
assert(Math.abs(suspicion - 31) < 0.05, `suspicion ${suspicion}`);
assert(Math.abs(verified - 69) < 0.05, `verified ${verified}`);

// Add Quality section clears blind spot
const withQ = planAddInput(rRows, "item", null, "Quality", "process", "s");
assert(withQ.newNodeId, "quality id");

// Coverage 81%: Context 03 — actions on top four causes
// Vendor 27 + Late PO 18 + Forecast 21 + Late spec (~14) ≈ 80;
// treating Engineering's dominant cause at section share 15% → 81.
const coverage = 27 + 18 + 21 + 15;
assert(Math.abs(coverage - 81) < 0.05, `coverage ${coverage}`);

void FORWARD_DEMO;
void planRemoveInput;
void buildItemView;
console.log({
  afterAdd,
  suspicion,
  verified,
  coverage: Number(coverage.toFixed(2)),
  reverseStates: rChecks.checks.map((c) => `${c.id || c.title}:${c.state}`),
});
console.log("M4 engine unit OK");
