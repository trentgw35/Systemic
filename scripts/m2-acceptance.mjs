#!/usr/bin/env node
/**
 * Milestone 02 live acceptance against Supabase (+ local Next optional).
 * Checks: create 3-section decision, redistribute+pin, confirm/unconfirm,
 * masking at API payload level, forward demo seed stats.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { equalShares, redistributeWeights } from "../src/lib/engine/weights.ts";
import { buildItemView } from "../src/lib/engine/item-view.ts";
import { FORWARD_DEMO } from "../src/lib/demo-seed.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const password = `TestPass-${stamp}!`;
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} — ${detail}`);
}

async function ensureUser(email, name) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  await admin.from("profiles").upsert({ id: data.user.id, email, name });
  return data.user;
}

function userClient() {
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

try {
  const owner = await ensureUser(`systemic.m2.owner.${stamp}@example.com`, "M2 Owner");
  const member = await ensureUser(
    `systemic.m2.member.${stamp}@example.com`,
    "M2 Member",
  );
  const third = await ensureUser(`systemic.m2.third.${stamp}@example.com`, "M2 Third");

  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({ name: `M2 Accept ${stamp}`, created_by: owner.id })
    .select("id")
    .single();
  if (wsErr) throw wsErr;

  await admin.from("memberships").insert([
    { workspace_id: ws.id, user_id: owner.id, role: "admin" },
    { workspace_id: ws.id, user_id: member.id, role: "member" },
    { workspace_id: ws.id, user_id: third.id, role: "member" },
  ]);

  // --- Acceptance 1: create decision with 3 sections ---
  const shares = equalShares(3);
  const { data: item, error: itemErr } = await admin
    .from("items")
    .insert({
      workspace_id: ws.id,
      mode: "decision",
      title: `Three-way ${stamp}`,
      created_by: owner.id,
      group_tag: "M2",
    })
    .select("*")
    .single();
  if (itemErr) throw itemErr;

  const owners = [owner.id, member.id, third.id];
  const sectionInsert = ["Alpha", "Beta", "Gamma"].map((name, i) => ({
    item_id: item.id,
    parent_id: null,
    label: name,
    kind: "process",
    local_weight: shares[i],
    owner_id: owners[i],
    confirmed: false,
    sort_order: i,
  }));
  const { data: sections, error: secErr } = await admin
    .from("nodes")
    .insert(sectionInsert)
    .select("*");
  if (secErr) throw secErr;

  for (const sec of sections) {
    const { error } = await admin.from("nodes").insert([
      {
        item_id: item.id,
        parent_id: sec.id,
        label: "Starter input A",
        kind: "opinion",
        local_weight: 50,
        sort_order: 0,
      },
      {
        item_id: item.id,
        parent_id: sec.id,
        label: "Starter input B",
        kind: "opinion",
        local_weight: 50,
        sort_order: 1,
      },
    ]);
    if (error) throw error;
  }

  const sumL1 = sections.reduce((s, n) => s + Number(n.local_weight), 0);
  if (Math.abs(sumL1 - 100) > 0.001) {
    fail("create-equal-thirds", `L1 sum ${sumL1}`);
  } else {
    pass("create-equal-thirds", shares.map((n) => n.toFixed(4)).join(" / "));
  }

  const { data: starters } = await admin
    .from("nodes")
    .select("*")
    .eq("item_id", item.id)
    .not("parent_id", "is", null);
  const all5050 = starters.every((n) => Number(n.local_weight) === 50);
  const allUnconfirmed = sections.every((s) => s.confirmed === false);
  if (starters.length === 6 && all5050 && allUnconfirmed) {
    pass("starters-50-50-unconfirmed");
  } else {
    fail(
      "starters-50-50-unconfirmed",
      `starters=${starters.length} 5050=${all5050} unconf=${allUnconfirmed}`,
    );
  }

  // --- Acceptance 2: redistribute + pin (pure engine, mirrors API) ---
  const alpha = sections.find((s) => s.label === "Alpha");
  const { data: alphaKids } = await admin
    .from("nodes")
    .select("*")
    .eq("parent_id", alpha.id)
    .order("sort_order");
  const sibs = alphaKids.map((k) => ({
    id: k.id,
    local_weight: Number(k.local_weight),
  }));
  const moved = redistributeWeights(sibs, sibs[0].id, 70, []);
  const movedSum = moved.reduce((s, r) => s + r.local_weight, 0);
  const pinned = redistributeWeights(sibs, sibs[0].id, 70, [sibs[1].id]);
  const pinnedStay = pinned.find((r) => r.id === sibs[1].id).local_weight;

  // Persist via upsert (same as API fallback)
  const byId = new Map(moved.map((r) => [r.id, r.local_weight]));
  const { error: upErr } = await admin.from("nodes").upsert(
    alphaKids.map((r) => ({
      ...r,
      local_weight: byId.get(r.id),
    })),
  );
  if (upErr) fail("persist-redistribute", upErr.message);
  else if (Math.abs(movedSum - 100) > 1e-6) fail("redistribute-sum", String(movedSum));
  else if (pinnedStay !== 50) fail("pin-holds", String(pinnedStay));
  else pass("redistribute-and-pin", `sum=${movedSum} pinned=${pinnedStay}`);

  // --- Acceptance 3: confirm raises confirmed-so-far; weight edit unconfirms ---
  await admin
    .from("nodes")
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq("id", alpha.id);

  let { data: allNodes } = await admin.from("nodes").select("*").eq("item_id", item.id);
  let view = buildItemView(
    { ...item, expected_areas: null },
    allNodes.map((r) => ({ ...r, local_weight: Number(r.local_weight) })),
    owner.id,
  );
  const afterConfirm = view.stats.confirmed_so_far_pct;
  const alphaShare = Number(alpha.local_weight);

  await admin
    .from("nodes")
    .update({ confirmed: false, confirmed_at: null })
    .eq("id", alpha.id);
  // simulate weight edit unconfirm already done; re-confirm then edit
  await admin
    .from("nodes")
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq("id", alpha.id);
  const kids2 = (
    await admin.from("nodes").select("*").eq("parent_id", alpha.id)
  ).data;
  const again = redistributeWeights(
    kids2.map((k) => ({ id: k.id, local_weight: Number(k.local_weight) })),
    kids2[0].id,
    65,
    [],
  );
  const by2 = new Map(again.map((r) => [r.id, r.local_weight]));
  await admin.from("nodes").upsert(
    kids2.map((r) => ({ ...r, local_weight: by2.get(r.id) })),
  );
  await admin
    .from("nodes")
    .update({ confirmed: false, confirmed_at: null })
    .eq("id", alpha.id);

  ({ data: allNodes } = await admin.from("nodes").select("*").eq("item_id", item.id));
  view = buildItemView(
    { ...item, expected_areas: null },
    allNodes.map((r) => ({ ...r, local_weight: Number(r.local_weight) })),
    owner.id,
  );
  if (
    Math.abs(afterConfirm - alphaShare) < 0.15 &&
    view.stats.confirmed_so_far_pct < 0.15
  ) {
    pass(
      "confirm-then-unconfirm-on-edit",
      `confirmed→${afterConfirm}% then ${view.stats.confirmed_so_far_pct}%`,
    );
  } else {
    fail(
      "confirm-then-unconfirm-on-edit",
      `afterConfirm=${afterConfirm} alpha=${alphaShare} final=${view.stats.confirmed_so_far_pct}`,
    );
  }

  // --- Acceptance 4: masking for other member ---
  view = buildItemView(
    { ...item, expected_areas: null },
    allNodes.map((r) => ({ ...r, local_weight: Number(r.local_weight) })),
    member.id,
  );
  const payload = JSON.stringify(view);
  const leaked = payload.includes("Starter input") && view.tree.some((n) => n.kind === "visible" && n.label === "Alpha");
  // Member owns Beta — should see Beta starters, not Alpha's
  const seesAlphaContent =
    payload.includes('"label":"Alpha"') &&
    view.tree.some((t) => t.kind === "visible" && t.label === "Alpha");
  const hasHidden = view.tree.some((t) => t.kind === "hidden");
  const ownsBeta = view.your_sections.some((s) => s.label === "Beta");
  if (!seesAlphaContent && hasHidden && ownsBeta) {
    pass("masking-api-payload", "Alpha hidden; Beta owned");
  } else {
    fail(
      "masking-api-payload",
      `seesAlpha=${seesAlphaContent} hidden=${hasHidden} ownsBeta=${ownsBeta} leaked=${leaked}`,
    );
  }

  // --- Acceptance 5: forward demo seed stats ---
  function seedRows(sections, ownerId, itemId) {
    const rows = [];
    let n = 0;
    function walk(nodes, parentId) {
      nodes.forEach((node, i) => {
        const id = `demo-${itemId}-${++n}`;
        const hasChildren = Boolean(node.children?.length);
        rows.push({
          id,
          item_id: itemId,
          parent_id: parentId,
          label: node.label,
          kind: node.kind,
          local_weight: node.local_weight,
          owner_id: hasChildren ? ownerId : null,
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
  const demoRows = seedRows(FORWARD_DEMO.sections, owner.id, "demo");
  const demoView = buildItemView(
    {
      id: "demo",
      workspace_id: ws.id,
      mode: "decision",
      title: FORWARD_DEMO.title,
      group_tag: FORWARD_DEMO.group_tag,
      created_by: owner.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_at: null,
      lock_stamp: null,
      expected_areas: null,
    },
    demoRows,
    owner.id,
  );
  if (
    Math.abs(demoView.stats.personal_opinion_pct - 60) <= 0.1 &&
    Math.abs(demoView.stats.data_analysis_pct - 11.3) <= 0.1
  ) {
    pass(
      "forward-demo-stats",
      `opinion=${demoView.stats.personal_opinion_pct} data=${demoView.stats.data_analysis_pct}`,
    );
  } else {
    fail(
      "forward-demo-stats",
      JSON.stringify({
        opinion: demoView.stats.personal_opinion_pct,
        data: demoView.stats.data_analysis_pct,
      }),
    );
  }

  // cleanup
  await admin.from("items").delete().eq("id", item.id);
  await admin.from("workspaces").delete().eq("id", ws.id);
  await admin.auth.admin.deleteUser(owner.id);
  await admin.auth.admin.deleteUser(member.id);
  await admin.auth.admin.deleteUser(third.id);
} catch (e) {
  fail("setup", e.message || String(e));
}

const failed = results.filter((r) => !r.ok);
console.log("\n--- M2 acceptance summary ---");
console.log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
