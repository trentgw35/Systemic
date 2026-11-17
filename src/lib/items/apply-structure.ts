import type { SupabaseClient } from "@supabase/supabase-js";
import type { StructureMutation } from "@/lib/engine/structure";

export async function applyStructureMutation(
  admin: SupabaseClient,
  itemId: string,
  mutation: StructureMutation,
) {
  if (mutation.removeIds.length) {
    // Delete deepest-first not required with ON DELETE CASCADE from parent,
    // but we listed all ids — delete leaves by deleting roots of each subtree
    // once: deleting the top removed node cascades. Prefer unique roots.
    const { error } = await admin
      .from("nodes")
      .delete()
      .in("id", mutation.removeIds);
    if (error) throw new Error(error.message);
  }

  if (mutation.upsert.length) {
    const { error } = await admin.from("nodes").upsert(mutation.upsert);
    if (error) throw new Error(error.message);
  }

  for (const parentId of mutation.unconfirmParentIds) {
    const { error } = await admin
      .from("nodes")
      .update({ confirmed: false, confirmed_at: null })
      .eq("id", parentId)
      .eq("item_id", itemId);
    if (error) throw new Error(error.message);
  }

  const { error: itemErr } = await admin
    .from("items")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (itemErr) throw new Error(itemErr.message);
}
