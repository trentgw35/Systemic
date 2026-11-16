import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FORWARD_DEMO,
  REVERSE_DEMO,
  type SeedNode,
} from "./demo-seed";

type Inserted = { id: string };

async function insertTree(
  admin: SupabaseClient,
  itemId: string,
  ownerId: string,
  nodes: SeedNode[],
  parentId: string | null,
) {
  // Insert an entire children-set in one statement so the deferred sum-to-100
  // trigger sees a complete set at commit.
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
    throw new Error(
      `Failed to insert children of ${parentId ?? "root"}: ${error?.message ?? "count mismatch"}`,
    );
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.children?.length) {
      await insertTree(
        admin,
        itemId,
        ownerId,
        n.children,
        (data[i] as Inserted).id,
      );
    }
  }
}

export async function seedDemoItems(
  admin: SupabaseClient,
  workspaceId: string,
  ownerId: string,
) {
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
  if (fErr || !forwardItem) {
    throw new Error(`Forward item: ${fErr?.message ?? "failed"}`);
  }
  await insertTree(
    admin,
    (forwardItem as Inserted).id,
    ownerId,
    FORWARD_DEMO.sections,
    null,
  );

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
  if (rErr || !reverseItem) {
    throw new Error(`Reverse item: ${rErr?.message ?? "failed"}`);
  }
  await insertTree(
    admin,
    (reverseItem as Inserted).id,
    ownerId,
    REVERSE_DEMO.sections,
    null,
  );

  return {
    forwardItemId: (forwardItem as Inserted).id,
    reverseItemId: (reverseItem as Inserted).id,
  };
}

export async function createDemoWorkspace(
  admin: SupabaseClient,
  ownerId: string,
  name = "Demo",
) {
  const { data: ws, error } = await admin
    .from("workspaces")
    .insert({ name, created_by: ownerId })
    .select("id")
    .single();
  if (error || !ws) {
    throw new Error(`Demo workspace: ${error?.message ?? "failed"}`);
  }

  const { error: memErr } = await admin.from("memberships").insert({
    workspace_id: (ws as Inserted).id,
    user_id: ownerId,
    role: "admin",
  });
  if (memErr) {
    throw new Error(`Demo membership: ${memErr.message}`);
  }

  await seedDemoItems(admin, (ws as Inserted).id, ownerId);
  return (ws as Inserted).id;
}
