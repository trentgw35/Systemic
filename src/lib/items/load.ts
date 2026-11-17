import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, NodeRow } from "@/lib/types";

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
): Promise<{ item: Item; rows: NodeRow[] } | { error: string; status: number }> {
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

  const { data: rows, error: nErr } = await supabase
    .from("nodes")
    .select("*")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true });

  if (nErr) {
    return { error: nErr.message, status: 500 };
  }

  return {
    item: item as Item,
    rows: (rows ?? []).map((r) => ({
      ...r,
      local_weight: Number(r.local_weight),
    })) as NodeRow[],
  };
}
