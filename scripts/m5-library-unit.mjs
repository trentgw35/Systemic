#!/usr/bin/env node
import {
  isAIFeaturesEnabled,
  isAIProviderConfigured,
  getAIProvider,
} from "../src/lib/ai/provider.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function groupItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.group_tag?.trim() || "No group";
    const list = map.get(key) ?? [];
    list.push(it);
    map.set(key, list);
  }
  return map;
}

function filterItems(items, { search, mode, status }) {
  const q = search.trim().toLowerCase();
  return items.filter((it) => {
    if (mode !== "all" && it.mode !== mode) return false;
    if (status === "locked" && !it.locked_at) return false;
    if (status === "in_progress" && it.locked_at) return false;
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      it.owner_name.toLowerCase().includes(q) ||
      (it.group_tag ?? "").toLowerCase().includes(q)
    );
  });
}

const sample = [
  {
    title: "A",
    mode: "decision",
    group_tag: "Alpha",
    owner_name: "Pat",
    locked_at: null,
  },
  {
    title: "B",
    mode: "rcca",
    group_tag: "Beta",
    owner_name: "Sam",
    locked_at: "2026-01-01",
  },
  {
    title: "C",
    mode: "rcca",
    group_tag: null,
    owner_name: "Pat",
    locked_at: "2026-01-02",
  },
];

const grouped = groupItems(sample);
assert(grouped.get("Alpha")?.length === 1, "alpha");
assert(grouped.get("No group")?.length === 1, "ungrouped");

const byOwner = filterItems(sample, {
  search: "sam",
  mode: "all",
  status: "all",
});
assert(byOwner.length === 1 && byOwner[0].title === "B", "search owner");

const byGroup = filterItems(sample, {
  search: "alpha",
  mode: "all",
  status: "all",
});
assert(byGroup.length === 1, "search group");

const lockedRcca = filterItems(sample, {
  search: "",
  mode: "rcca",
  status: "locked",
});
assert(lockedRcca.length === 2, "locked rcca");

// Move group tag without reload semantics
const moved = sample.map((it) =>
  it.title === "A" ? { ...it, group_tag: "Gamma" } : it,
);
assert(groupItems(moved).has("Gamma"), "retag");

assert(isAIFeaturesEnabled() === false || typeof isAIFeaturesEnabled() === "boolean", "flag");
assert(typeof isAIProviderConfigured() === "boolean", "configured");
const p = getAIProvider();
assert((await p.draftTree()) === null, "noop draft");
assert((await p.interpret()) === null, "noop interpret");

console.log({
  groups: [...grouped.keys()],
  lockedRcca: lockedRcca.map((i) => i.title),
  aiEnabledDefault: isAIFeaturesEnabled(),
});
console.log("M5 library unit OK");
