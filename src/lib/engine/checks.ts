import type { ItemMode } from "@/lib/types";
import { confirmedSharePct } from "./stats";
import { flattenTree, leavesOf, type TreeNode } from "./tree";

export type CheckState = "Check" | "Borderline" | "OK";

export type CheckResult = {
  id: string;
  title: string;
  state: CheckState;
  detail: string | null;
};

export type ChecksSnapshot = {
  mode: ItemMode;
  checks: CheckResult[];
  all_clear: boolean;
};

function round1(n: number) {
  return Number(n.toFixed(1));
}

function personTotals(
  tree: TreeNode[],
  nameById: Map<string, string>,
): Array<{ userId: string; name: string; share: number }> {
  const flat = flattenTree(tree);
  const leaves = leavesOf(tree);
  const byId = new Map(flat.map((n) => [n.id, n]));

  /** Owning person for a leaf = owner_id of the nearest ancestor with children (the set containing it), walking up including parent. */
  function ownerOfLeaf(leaf: TreeNode): string | null {
    let parentId = leaf.parent_id;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      if (parent.owner_id) return parent.owner_id;
      parentId = parent.parent_id;
    }
    return null;
  }

  const totals = new Map<string, number>();
  for (const leaf of leaves) {
    const owner = ownerOfLeaf(leaf);
    if (!owner) continue;
    totals.set(owner, (totals.get(owner) ?? 0) + leaf.share_of_whole);
  }

  return [...totals.entries()]
    .map(([userId, share]) => ({
      userId,
      name: nameById.get(userId) ?? "Someone",
      share,
    }))
    .sort((a, b) => b.share - a.share);
}

function opinionAnecdoteByPerson(
  tree: TreeNode[],
  nameById: Map<string, string>,
): Array<{ userId: string; name: string; share: number }> {
  const flat = flattenTree(tree);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const leaves = leavesOf(tree).filter(
    (l) => l.kind === "opinion" || l.kind === "anecdote",
  );

  function ownerOfLeaf(leaf: TreeNode): string | null {
    let parentId = leaf.parent_id;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      if (parent.owner_id) return parent.owner_id;
      parentId = parent.parent_id;
    }
    return null;
  }

  const totals = new Map<string, number>();
  for (const leaf of leaves) {
    const owner = ownerOfLeaf(leaf);
    if (!owner) continue;
    totals.set(owner, (totals.get(owner) ?? 0) + leaf.share_of_whole);
  }
  return [...totals.entries()]
    .map(([userId, share]) => ({
      userId,
      name: nameById.get(userId) ?? "Someone",
      share,
    }))
    .sort((a, b) => b.share - a.share);
}

export function lockStampForUnconfirmedShare(unconfirmedPct: number): string {
  if (unconfirmedPct <= 10) return "Final — all sections confirmed";
  if (unconfirmedPct <= 25) {
    const confirmed = Math.round(100 - unconfirmedPct);
    return `Final — ${confirmed}% confirmed`;
  }
  return "Final — draft (sections unconfirmed)";
}

export function computeChecks(
  tree: TreeNode[],
  mode: ItemMode,
  nameById: Map<string, string> = new Map(),
  expectedAreas: string[] | null = null,
): ChecksSnapshot {
  if (mode === "rcca") {
    return computeReverseChecks(tree, nameById, expectedAreas);
  }
  return computeForwardChecks(tree, nameById);
}

function computeForwardChecks(
  tree: TreeNode[],
  nameById: Map<string, string>,
): ChecksSnapshot {
  const leaves = leavesOf(tree);
  const opinionPct = leaves
    .filter((l) => l.kind === "opinion")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const dataPct = leaves
    .filter((l) => l.kind === "data")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const confirmed = confirmedSharePct(tree);
  const unconfirmed = 100 - confirmed;

  const checks: CheckResult[] = [];

  // 1. Mostly personal opinion
  let opinionState: CheckState = "OK";
  if (opinionPct > 50) opinionState = "Check";
  else if (opinionPct >= 45) opinionState = "Borderline";
  checks.push({
    id: "mostly-personal-opinion",
    title: "Mostly personal opinion",
    state: opinionState,
    detail:
      opinionState === "OK"
        ? null
        : "More than half of this decision rests on personal opinion rather than evidence or analysis.",
  });

  // 2. Heavy weight, light evidence
  const heavyLeaf = leaves.find(
    (l) =>
      (l.kind === "opinion" || l.kind === "anecdote") && l.share_of_whole >= 5,
  );
  const byPerson = opinionAnecdoteByPerson(tree, nameById);
  const heavyPerson = byPerson.find((p) => p.share >= 10);
  let heavyState: CheckState = "OK";
  let heavyDetail: string | null = null;
  if (heavyLeaf || heavyPerson) {
    heavyState = "Check";
    if (heavyPerson) {
      heavyDetail = `${heavyPerson.name}'s opinion-based inputs add up to ${round1(heavyPerson.share)}% of this decision.`;
    } else if (heavyLeaf) {
      heavyDetail = `An opinion- or anecdote-based input carries ${round1(heavyLeaf.share_of_whole)}% of this decision.`;
    }
  }
  checks.push({
    id: "heavy-weight-light-evidence",
    title: "Heavy weight, light evidence",
    state: heavyState,
    detail: heavyDetail,
  });

  // 3. One person holds outsized weight
  const people = personTotals(tree, nameById);
  const top = people[0];
  const second = people[1];
  let outsizedState: CheckState = "OK";
  let outsizedDetail: string | null = null;
  if (
    top &&
    second &&
    top.share > 35 &&
    top.share >= second.share * 1.5
  ) {
    outsizedState = "Check";
    outsizedDetail = `${top.name}'s inputs total ${round1(top.share)}% of this decision — more than 1.5× the next person's share.`;
  } else if (top && !second && top.share > 35) {
    // Single person — relative rule needs a second person; do not fire on absolute alone per 40/40 note
    outsizedState = "OK";
  }
  checks.push({
    id: "one-person-outsized",
    title: "One person holds outsized weight",
    state: outsizedState,
    detail: outsizedDetail,
  });

  // 4. Very little data underneath
  checks.push({
    id: "very-little-data",
    title: "Very little data underneath",
    state: dataPct < 15 ? "Check" : "OK",
    detail:
      dataPct < 15
        ? "Less than 15% of this decision rests on data & analysis."
        : null,
  });

  // 5. Sections still unconfirmed
  checks.push({
    id: "sections-unconfirmed",
    title: "Sections still unconfirmed",
    state: unconfirmed > 10 ? "Check" : "OK",
    detail:
      unconfirmed > 10
        ? `${round1(unconfirmed)}% of the decision sits under sections that are not yet confirmed.`
        : null,
  });

  const all_clear = checks.every((c) => c.state === "OK");
  return { mode: "decision", checks, all_clear };
}

function computeReverseChecks(
  tree: TreeNode[],
  nameById: Map<string, string>,
  expectedAreas: string[] | null,
): ChecksSnapshot {
  const leaves = leavesOf(tree);
  const l1 = tree;
  const suspicion = leaves
    .filter((l) => l.kind === "opinion" || l.kind === "anecdote")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const verified = leaves
    .filter((l) => l.kind === "data")
    .reduce((s, l) => s + l.share_of_whole, 0);
  const confirmed = confirmedSharePct(tree);
  const unconfirmed = 100 - confirmed;

  const checks: CheckResult[] = [];

  const sortedL1 = [...l1].sort((a, b) => b.share_of_whole - a.share_of_whole);
  const top = sortedL1[0];
  const second = sortedL1[1];
  let areaState: CheckState = "OK";
  let areaDetail: string | null = null;
  if (
    top &&
    second &&
    top.share_of_whole > 35 &&
    top.share_of_whole >= second.share_of_whole * 1.5
  ) {
    areaState = "Check";
    areaDetail = `${top.label} accounts for ${round1(top.share_of_whole)}% — more than 1.5× the next area's share.`;
  }
  checks.push({
    id: "one-area-most",
    title: "One area carries most of the explanation",
    state: areaState,
    detail: areaDetail,
  });

  const topLeaf = [...leaves].sort(
    (a, b) => b.share_of_whole - a.share_of_whole,
  )[0];
  const byPerson = opinionAnecdoteByPerson(tree, nameById);
  const heavyPerson = byPerson.find((p) => p.share >= 10);
  let leadState: CheckState = "OK";
  let leadDetail: string | null = null;
  if (
    topLeaf &&
    (topLeaf.kind === "opinion" || topLeaf.kind === "anecdote")
  ) {
    leadState = "Check";
    leadDetail = `The leading cause is ${topLeaf.kind === "opinion" ? "suspected, unverified" : "reported, not checked"}.`;
  } else if (heavyPerson) {
    leadState = "Check";
    leadDetail = `${heavyPerson.name}'s opinion-based inputs add up to ${round1(heavyPerson.share)}% of this problem.`;
  }
  checks.push({
    id: "leading-cause-not-verified",
    title: "Leading cause not verified",
    state: leadState,
    detail: leadDetail,
  });

  let suspicionState: CheckState = "OK";
  if (suspicion > 50) suspicionState = "Check";
  else if (suspicion >= 45) suspicionState = "Borderline";
  checks.push({
    id: "mostly-suspicion",
    title: "Mostly suspicion",
    state: suspicionState,
    detail:
      suspicionState === "OK"
        ? null
        : "More than half of this explanation rests on suspicion rather than verified causes.",
  });

  checks.push({
    id: "very-little-verified",
    title: "Very little verified",
    state: verified < 15 ? "Check" : "OK",
    detail:
      verified < 15
        ? "Less than 15% of this explanation is verified in records."
        : null,
  });

  checks.push({
    id: "sections-unconfirmed",
    title: "Sections still unconfirmed",
    state: unconfirmed > 10 ? "Check" : "OK",
    detail:
      unconfirmed > 10
        ? `${round1(unconfirmed)}% of the explanation sits under sections that are not yet confirmed.`
        : null,
  });

  if (expectedAreas?.length) {
    const labels = new Set(l1.map((n) => n.label.toLowerCase()));
    for (const area of expectedAreas) {
      if (!labels.has(area.toLowerCase())) {
        checks.push({
          id: `blind-spot-${area}`,
          title: "Areas not yet looked at",
          state: "Check",
          detail: `${area} has no section in this analysis. An area with no section is a blind spot, not a zero.`,
        });
      }
    }
  }

  const all_clear = checks.every((c) => c.state === "OK");
  return { mode: "rcca", checks, all_clear };
}

export function confirmationsList(tree: TreeNode[], nameById: Map<string, string>) {
  return flattenTree(tree)
    .filter((n) => n.children.length > 0)
    .map((n) => ({
      node_id: n.id,
      label: n.label,
      share_of_whole: n.share_of_whole,
      confirmed: n.confirmed,
      confirmed_at: n.confirmed_at,
      owner_id: n.owner_id,
      owner_name: n.owner_id
        ? nameById.get(n.owner_id) ?? "Unknown"
        : null,
    }));
}
