#!/usr/bin/env node
import { FORWARD_DEMO, REVERSE_DEMO } from "../src/lib/demo-seed.ts";
import { buildTree } from "../src/lib/engine/tree.ts";
import {
  computeChecks,
  lockStampForUnconfirmedShare,
} from "../src/lib/engine/checks.ts";
import { confirmedSharePct } from "../src/lib/engine/stats.ts";
import { redistributeWeights } from "../src/lib/engine/weights.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function seedRows(sections, owners) {
  const rows = [];
  let n = 0;
  let l1 = 0;
  function walk(nodes, parentId, inheritOwner) {
    nodes.forEach((node, i) => {
      const id = `n${++n}`;
      const hasChildren = Boolean(node.children?.length);
      const owner =
        parentId === null
          ? owners[l1++]
          : hasChildren
            ? inheritOwner
            : null;
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
  ["ceo", "CEO"],
  ["cmo", "CMO"],
  ["cfo", "CFO"],
  ["cto", "CTO"],
]);
const rows = seedRows(FORWARD_DEMO.sections, ["ceo", "cmo", "cfo", "cto"]);
const tree = buildTree(rows);
const checks = computeChecks(tree, "decision", names);

const byId = Object.fromEntries(checks.checks.map((c) => [c.id, c]));
assert(byId["mostly-personal-opinion"].state === "Check", "check1");
assert(byId["heavy-weight-light-evidence"].state === "Check", "check2");
assert(byId["one-person-outsized"].state === "OK", "check3 40/40");
assert(byId["very-little-data"].state === "Check", "check4");
assert(byId["sections-unconfirmed"].state === "Check", "check5");

assert(byId["mostly-personal-opinion"].state === "Check", "opinion fires");

// Borderline band 45–50%: synthetic tree with ~47.5% opinion leaves
const borderlineRows = [
  {
    id: "s1",
    item_id: "b",
    parent_id: null,
    label: "A",
    kind: "process",
    local_weight: 50,
    owner_id: "ceo",
    delegated_from: null,
    confirmed: true,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "s2",
    item_id: "b",
    parent_id: null,
    label: "B",
    kind: "process",
    local_weight: 50,
    owner_id: "cmo",
    delegated_from: null,
    confirmed: true,
    confirmed_at: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "a1",
    item_id: "b",
    parent_id: "s1",
    label: "op",
    kind: "opinion",
    local_weight: 95,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "a2",
    item_id: "b",
    parent_id: "s1",
    label: "data",
    kind: "data",
    local_weight: 5,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "b1",
    item_id: "b",
    parent_id: "s2",
    label: "data2",
    kind: "data",
    local_weight: 100,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
];
// opinion share = 50 * 0.95 = 47.5
const tree2 = buildTree(borderlineRows);
const checks2 = computeChecks(tree2, "decision", names);
const op2 = checks2.checks.find((c) => c.id === "mostly-personal-opinion");
const opinionPct = 47.5;
assert(
  op2.state === "Borderline",
  `borderline expected, state=${op2.state}`,
);

// Check 2 (b): person opinion+anecdote ≥10% with no single leaf ≥5%
const heavyPersonRows = [
  {
    id: "p1",
    item_id: "h",
    parent_id: null,
    label: "Sec",
    kind: "process",
    local_weight: 100,
    owner_id: "ceo",
    delegated_from: null,
    confirmed: true,
    confirmed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
  ...[0, 1, 2, 3].map((i) => ({
    id: `op${i}`,
    item_id: "h",
    parent_id: "p1",
    label: `op${i}`,
    kind: "opinion",
    local_weight: 4,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: i,
    created_at: new Date().toISOString(),
  })),
  {
    id: "rest",
    item_id: "h",
    parent_id: "p1",
    label: "data",
    kind: "data",
    local_weight: 84,
    owner_id: null,
    delegated_from: null,
    confirmed: false,
    confirmed_at: null,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
];
const heavyChecks = computeChecks(buildTree(heavyPersonRows), "decision", names);
const heavy = heavyChecks.checks.find((c) => c.id === "heavy-weight-light-evidence");
assert(heavy.state === "Check", "heavy person subtotal");
assert(
  /CEO's opinion-based inputs add up to 16%/.test(heavy.detail || ""),
  `detail=${heavy.detail}`,
);

// Stamp grades
assert(
  lockStampForUnconfirmedShare(40) === "Final — draft (sections unconfirmed)",
  "draft stamp",
);
assert(
  lockStampForUnconfirmedShare(0) === "Final — all sections confirmed",
  "all confirmed",
);
assert(
  lockStampForUnconfirmedShare(20) === "Final — 80% confirmed",
  "80% stamp",
);

const conf = confirmedSharePct(tree);
assert(Math.abs(conf - 60) < 0.2, `confirmed ${conf}`);

// Reverse smoke
const rRows = seedRows(REVERSE_DEMO.sections, ["s", "p", "e", "l"]);
const rTree = buildTree(rRows);
const rChecks = computeChecks(
  rTree,
  "rcca",
  new Map([
    ["s", "Supply"],
    ["p", "Planning"],
    ["e", "Engineering"],
    ["l", "Logistics"],
  ]),
  REVERSE_DEMO.expected_areas,
);
assert(
  rChecks.checks.some(
    (c) => c.id === "one-area-most" && c.state === "Check",
  ),
  "reverse area check",
);
assert(
  rChecks.checks.some((c) => c.title === "Areas not yet looked at"),
  "quality blind spot",
);

void redistributeWeights;
console.log({
  forwardStates: checks.checks.map((c) => `${c.id}:${c.state}`),
  borderlineOpinion: opinionPct,
  stamps: [
    lockStampForUnconfirmedShare(40),
    lockStampForUnconfirmedShare(20),
    lockStampForUnconfirmedShare(0),
  ],
});
console.log("M3 checks unit OK");
