import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, NodeRow } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function loadItemForMember(
  supabase: SupabaseClient,
  itemId: string,
  userId: string,
): Promise<
  | {
      item: Item;
      rows: NodeRow[];
      nameById: Map<string, string>;
      members: Array<{ id: string; name: string; email: string }>;
      actionNotes: Array<{
        id: string;
        node_id: string;
        text: string;
        owner_name: string;
        due_date: string | null;
      }>;
    }
  | { error: string; status: number }
> {
  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error || !item) {
    return { error: "Item not found", status: 404 };
  }

  const membership = await requireWorkspaceMember(
    supabase,
    item.workspace_id,
    userId,
  );
  if (!membership) {
    return { error: "Forbidden", status: 403 };
  }

  const admin = createAdminClient();
  const { data: rows, error: nErr } = await admin
    .from("nodes")
    .select("*")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true });

  if (nErr) {
    return { error: nErr.message, status: 500 };
  }

  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id, profiles(id, name, email)")
    .eq("workspace_id", item.workspace_id);

  const members: Array<{ id: string; name: string; email: string }> = [];
  const nameById = new Map<string, string>();
  for (const m of memberships ?? []) {
    const p = m.profiles as unknown as {
      id: string;
      name: string;
      email: string;
    } | null;
    const id = p?.id ?? m.user_id;
    const name = p?.name?.trim() || p?.email || "Member";
    const email = p?.email ?? "";
    members.push({ id, name, email });
    nameById.set(id, name);
  }

  for (const r of rows ?? []) {
    if (r.owner_id && !nameById.has(r.owner_id)) {
      nameById.set(r.owner_id, "Member");
    }
  }

  const { data: notes } = await admin
    .from("action_notes")
    .select("id, node_id, text, owner_name, due_date")
    .eq("item_id", itemId);

  return {
    item: item as Item,
    rows: (rows ?? []).map((r) => ({
      ...r,
      local_weight: Number(r.local_weight),
    })) as NodeRow[],
    nameById,
    members,
    actionNotes: (notes ?? []).map((n) => ({
      id: n.id,
      node_id: n.node_id,
      text: n.text,
      owner_name: n.owner_name,
      due_date: n.due_date,
    })),
  };
}
