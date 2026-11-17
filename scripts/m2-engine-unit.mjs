#!/usr/bin/env node
/**
 * Offline M02 engine unit checks (no database).
 */
import { equalShares, redistributeWeights } from "../src/lib/engine/weights.ts";
import { buildTree } from "../src/lib/engine/tree.ts";
import { computeStats } from "../src/lib/engine/stats.ts";
import { buildItemView } from "../src/lib/engine/item-view.ts";
import { FORWARD_DEMO, leafShares } from "../src/lib/demo-seed.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// equal thirds
const thirds = equalShares(3);
assert(Math.abs(thirds.reduce((s, n) => s + n, 0) - 100) < 1e-6, "thirds sum");
assert(thirds.length === 3, "thirds len");

// redistribute + pin
const sibs = [
  { id: "a", local_weight: 50 },
  { id: "b", local_weight: 30 },
  { id: "c", local_weight: 20 },
];
const moved = redistributeWeights(sibs, "a", 70, []);
assert(
  Math.abs(moved.reduce((s, r) => s + r.local_weight, 0) - 100) < 1e-6,
  "moved sum",
);
const pinned = redistributeWeights(sibs, "a", 70, ["c"]);
const c = pinned.find((r) => r.id === "c");
assert(c.local_weight === 20, `pinned c stayed 20, got ${c.local_weight}`);
assert(
  Math.abs(pinned.reduce((s, r) => s + r.local_weight, 0) - 100) < 1e-6,
  "pinned sum",
);

// Forward seed stats via tree builder
function seedToRows(sections, itemId = "item") {
  const rows = [];
  let n = 0;
  function walk(nodes, parentId) {
    nodes.forEach((node, i) => {
      const id = `n${++n}`;
      const hasChildren = Boolean(node.children?.length);
      rows.push({
        id,
        item_id: itemId,
        parent_id: parentId,
        label: node.label,
        kind: node.kind,
        local_weight: node.local_weight,
        owner_id: hasChildren ? "owner" : null,
        delegated_from: null,
        confirmed: hasChildren ? Boolean(node.confirmed) : false,
        confirmed_at: null,
        sort_order: i,
        created_at: new Date().toISOString(),
      });
      if (node.children?.length) walk(node.children, id);
    });
  }
  walk(sections, null);
  return rows;
}

const rows = seedToRows(FORWARD_DEMO.sections);
const tree = buildTree(rows);
const stats = computeStats(tree, "decision", null, null);
assert(Math.abs(stats.opinion_leaf_pct - 60) < 0.05, `opinion ${stats.opinion_leaf_pct}`);
assert(Math.abs(stats.data_leaf_pct - 11.3) < 0.05, `data ${stats.data_leaf_pct}`);
assert(Math.abs(stats.confirmed_so_far_pct - 60) < 0.05, `confirmed ${stats.confirmed_so_far_pct}`);

// Masking: other member does not see CEO labels
const item = {
  id: "item",
  workspace_id: "ws",
  mode: "decision",
  title: FORWARD_DEMO.title,
  group_tag: FORWARD_DEMO.group_tag,
  created_by: "owner",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locked_at: null,
  lock_stamp: null,
  expected_areas: null,
};
// Re-seed with distinct owners per L1
const ownerRows = seedToRows(FORWARD_DEMO.sections);
const l1 = ownerRows.filter((r) => r.parent_id === null);
l1.forEach((r, i) => {
  r.owner_id = `user${i}`;
});
// nested owners stay as first pass — for mask test only L1 matters
const viewOther = buildItemView(item, ownerRows, "user1");
const hidden = viewOther.tree.filter((n) => n.kind === "hidden");
assert(hidden.length >= 1, "has hidden sections");
const blob = JSON.stringify(viewOther);
assert(!blob.includes("Gut feel on brand fit"), "CEO content absent from API payload");
assert(viewOther.your_sections.length === 1, "other user sees one own section");
assert(
  Math.abs(viewOther.stats.personal_opinion_pct - 60) < 0.1,
  "stats still show full-tree opinion",
);

const leaves = leafShares(FORWARD_DEMO.sections);
console.log({
  thirds,
  moved,
  pinned,
  opinion: stats.opinion_leaf_pct,
  data: stats.data_leaf_pct,
  confirmed: stats.confirmed_so_far_pct,
  leafCount: leaves.length,
  hiddenCount: hidden.length,
});
console.log("M2 engine unit OK");
