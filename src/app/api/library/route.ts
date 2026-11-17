import { NextResponse } from "next/server";
import { confirmedSharePct } from "@/lib/engine/stats";
import { buildTree } from "@/lib/engine/tree";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NodeRow } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", user.id);

  const workspaces =
    memberships
      ?.map((m) => m.workspaces as unknown as { id: string; name: string })
      .filter(Boolean) ?? [];
  const workspaceIds = workspaces.map((w) => w.id);
  const wsName = new Map(workspaces.map((w) => [w.id, w.name]));

  if (workspaceIds.length === 0) {
    return NextResponse.json({ items: [], workspaces: [] });
  }

  const admin = createAdminClient();
  const { data: items, error } = await admin
    .from("items")
    .select(
      "id, title, mode, group_tag, workspace_id, created_by, created_at, locked_at, lock_stamp, updated_at",
    )
    .in("workspace_id", workspaceIds)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: nodes } =
    itemIds.length > 0
      ? await admin.from("nodes").select("*").in("item_id", itemIds)
      : { data: [] as NodeRow[] };

  const nodesByItem = new Map<string, NodeRow[]>();
  for (const n of nodes ?? []) {
    const list = nodesByItem.get(n.item_id) ?? [];
    list.push({ ...n, local_weight: Number(n.local_weight) } as NodeRow);
    nodesByItem.set(n.item_id, list);
  }

  const ownerIds = [
    ...new Set((items ?? []).map((i) => i.created_by as string)),
  ];
  const { data: profiles } =
    ownerIds.length > 0
      ? await admin.from("profiles").select("id, name, email").in("id", ownerIds)
      : { data: [] };
  const ownerName = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.name?.trim() || p.email || "Someone",
    ]),
  );

  const rows = (items ?? []).map((item) => {
    const tree = buildTree(nodesByItem.get(item.id) ?? []);
    const confirmed = item.locked_at
      ? null
      : Number(confirmedSharePct(tree).toFixed(1));
    return {
      id: item.id,
      title: item.title,
      mode: item.mode,
      group_tag: item.group_tag,
      workspace_id: item.workspace_id,
      workspace_name: wsName.get(item.workspace_id) ?? "Workspace",
      created_by: item.created_by,
      owner_name: ownerName.get(item.created_by) ?? "Someone",
      created_at: item.created_at,
      locked_at: item.locked_at,
      lock_stamp: item.lock_stamp,
      updated_at: item.updated_at,
      status: item.lock_stamp ?? "In progress",
      confirmed_share: confirmed,
      viewer_is_owner: item.created_by === user.id,
    };
  });

  return NextResponse.json({
    items: rows,
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
  });
}
