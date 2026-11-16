#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  FORWARD_DEMO,
  REVERSE_DEMO,
} from "../src/lib/demo-seed.ts";

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
const email1 = `systemic.owner.${stamp}@example.com`;
const email2 = `systemic.member.${stamp}@example.com`;
const password = `TestPass-${stamp}!`;
const results = [];

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

async function insertTree(itemId, ownerId, nodes, parentId) {
  const rows = nodes.map((n, i) => {
    const hasChildren = Boolean(n.children?.length);
    return {
      item_id: itemId,
      parent_id: parentId,
      label: n.label,
      kind: n.kind,
      local_weight: n.local_weight,
      owner_id: hasChildren || n.ownsChildren ? ownerId : null,
      confirmed: hasChildren ? Boolean(n.confirmed) : false,
      confirmed_at:
        hasChildren && n.confirmed ? new Date().toISOString() : null,
      sort_order: i,
    };
  });
  const { data, error } = await admin.from("nodes").insert(rows).select("id");
  if (error || !data || data.length !== nodes.length) {
    throw new Error(error?.message ?? "node insert failed");
  }
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].children?.length) {
      await insertTree(itemId, ownerId, nodes[i].children, data[i].id);
    }
  }
}

async function seedDemo(workspaceId, ownerId) {
  const { data: forwardItem, error: fErr } = await admin
    .from("items")
    .insert({
      workspace_id: workspaceId,
      mode: FORWARD_DEMO.mode,
      title: FORWARD_DEMO.title,
      group_tag: FORWARD_DEMO.group_tag,
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (fErr) throw fErr;
  await insertTree(forwardItem.id, ownerId, FORWARD_DEMO.sections, null);

  const { data: reverseItem, error: rErr } = await admin
    .from("items")
    .insert({
      workspace_id: workspaceId,
      mode: REVERSE_DEMO.mode,
      title: REVERSE_DEMO.title,
      group_tag: REVERSE_DEMO.group_tag,
      created_by: ownerId,
      expected_areas: REVERSE_DEMO.expected_areas,
    })
    .select("id")
    .single();
  if (rErr) throw rErr;
  await insertTree(reverseItem.id, ownerId, REVERSE_DEMO.sections, null);
}

try {
  const owner = await ensureUser(email1, "Owner One");
  await ensureUser(email2, "Member Two");
  results.push({ step: "create users", ok: true });

  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({ name: "Acceptance Demo", created_by: owner.id })
    .select("id")
    .single();
  if (wsErr) throw wsErr;
  const { error: memErr } = await admin.from("memberships").insert({
    workspace_id: ws.id,
    user_id: owner.id,
    role: "admin",
  });
  if (memErr) throw memErr;
  await seedDemo(ws.id, owner.id);
  const wsId = ws.id;
  results.push({ step: "create demo workspace + seed", ok: true, wsId });

  const ownerSb = userClient();
  const { error: sign1 } = await ownerSb.auth.signInWithPassword({
    email: email1,
    password,
  });
  if (sign1) throw new Error(sign1.message);

  const { data: ownerItems, error: oiErr } = await ownerSb
    .from("items")
    .select("id,title,mode")
    .eq("workspace_id", wsId);
  if (oiErr) throw oiErr;
  results.push({
    step: "owner sees items",
    ok: ownerItems.length === 2,
    count: ownerItems.length,
    titles: ownerItems.map((i) => i.title),
  });

  const { data: nodes, error: nErr } = await admin
    .from("nodes")
    .select("id,item_id,parent_id,local_weight")
    .in(
      "item_id",
      ownerItems.map((i) => i.id),
    );
  if (nErr) throw nErr;
  const groups = new Map();
  for (const n of nodes) {
    const key = `${n.item_id}::${n.parent_id ?? "ROOT"}`;
    groups.set(key, (groups.get(key) || 0) + Number(n.local_weight));
  }
  const bad = [...groups.entries()].filter(([, s]) => Math.abs(s - 100) > 0.001);
  results.push({
    step: "children-set sums",
    ok: bad.length === 0,
    sets: groups.size,
    bad,
  });

  const token = `invite_${stamp}_${Math.random().toString(16).slice(2)}`;
  const { error: invErr } = await admin.from("workspace_invites").insert({
    workspace_id: wsId,
    email: email2,
    token,
    role: "member",
    created_by: owner.id,
  });
  if (invErr) throw invErr;
  results.push({ step: "create invite", ok: true });

  const memberSb = userClient();
  const { error: sign2 } = await memberSb.auth.signInWithPassword({
    email: email2,
    password,
  });
  if (sign2) throw new Error(sign2.message);

  const { data: acceptedWs, error: accErr } = await memberSb.rpc(
    "accept_invite",
    { invite_token: token },
  );
  if (accErr) throw accErr;
  results.push({
    step: "accept invite",
    ok: acceptedWs === wsId,
    acceptedWs,
  });

  const { data: memberItems, error: miErr } = await memberSb
    .from("items")
    .select("id,title")
    .eq("workspace_id", wsId);
  if (miErr) throw miErr;
  results.push({
    step: "member sees demo items",
    ok: memberItems.length === 2,
    count: memberItems.length,
  });

  const email3 = `systemic.outsider.${stamp}@example.com`;
  await ensureUser(email3, "Outsider");
  const outSb = userClient();
  await outSb.auth.signInWithPassword({ email: email3, password });
  const { data: deniedItems, error: dErr } = await outSb
    .from("items")
    .select("id")
    .eq("workspace_id", wsId);
  results.push({
    step: "non-member denied items",
    ok: !dErr && (deniedItems?.length ?? 0) === 0,
    count: deniedItems?.length ?? null,
    error: dErr?.message ?? null,
  });
  const { data: deniedWs } = await outSb
    .from("workspaces")
    .select("id")
    .eq("id", wsId);
  results.push({
    step: "non-member denied workspace row",
    ok: (deniedWs?.length ?? 0) === 0,
    count: deniedWs?.length ?? null,
  });

  const { data: emptyWs, error: cErr } = await ownerSb.rpc("create_workspace", {
    ws_name: `Empty ${stamp}`,
    seed_demo: false,
  });
  results.push({
    step: "create_workspace RPC",
    ok: !cErr && !!emptyWs,
    emptyWs,
    error: cErr?.message,
  });
} catch (e) {
  results.push({ step: "FATAL", ok: false, error: e.message || String(e) });
}

console.log(JSON.stringify(results, null, 2));
process.exit(results.some((r) => r.ok === false) ? 1 : 0);
