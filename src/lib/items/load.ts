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

/**
 * Load item + full node tree for a workspace member.
 * Membership is checked with the user-scoped client; nodes are read with the
 * service role so RLS can deny direct browser/PostgREST access to other
 * members' pre-lock-in content while the API still computes masked views.
 */
export async function loadItemForMember(
  supabase: SupabaseClient,
  itemId: string,
  userId: string,
): Promise<
  | { item: Item; rows: NodeRow[]; nameById: Map<string, string> }
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

  const ownerIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => r.owner_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameById = new Map<string, string>();
  if (ownerIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", ownerIds);
    for (const p of profiles ?? []) {
      nameById.set(p.id, p.name?.trim() || p.email || "Someone");
    }
  }

  return {
    item: item as Item,
    rows: (rows ?? []).map((r) => ({
      ...r,
      local_weight: Number(r.local_weight),
    })) as NodeRow[],
    nameById,
  };
}
