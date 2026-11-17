import { NextResponse } from "next/server";
import { z } from "zod";
import { childrenOf } from "@/lib/engine/tree";
import { redistributeWeights } from "@/lib/engine/weights";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  weight: z.number().min(0).max(100),
  pinned_sibling_ids: z.array(z.string().uuid()).default([]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string; nodeId: string }> },
) {
  const { itemId, nodeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loaded = await loadItemForMember(supabase, itemId, user.id);
  if ("error" in loaded) {
    return NextResponse.json(
      { error: loaded.error },
      { status: loaded.status },
    );
  }

  if (loaded.item.locked_at) {
    return NextResponse.json({ error: "Item is locked in" }, { status: 409 });
  }

  const target = loaded.rows.find((r) => r.id === nodeId);
  if (!target) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }
  if (!target.parent_id) {
    return NextResponse.json(
      { error: "Level-1 section weights are edited when reshaping the item" },
      { status: 400 },
    );
  }

  const parent = loaded.rows.find((r) => r.id === target.parent_id);
  if (!parent?.owner_id || parent.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the section owner can change these weights" },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const siblingRows = childrenOf(loaded.rows, target.parent_id);
  const siblings = siblingRows.map((r) => ({
    id: r.id,
    local_weight: Number(r.local_weight),
  }));

  let next: ReturnType<typeof redistributeWeights>;
  try {
    next = redistributeWeights(
      siblings,
      nodeId,
      parsed.data.weight,
      parsed.data.pinned_sibling_ids,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Redistribute failed" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const byId = new Map(next.map((r) => [r.id, r.local_weight]));
  const upsertRows = siblingRows.map((r) => ({
    id: r.id,
    item_id: r.item_id,
    parent_id: r.parent_id,
    label: r.label,
    kind: r.kind,
    local_weight: byId.get(r.id) ?? r.local_weight,
    owner_id: r.owner_id,
    delegated_from: r.delegated_from,
    confirmed: r.confirmed,
    confirmed_at: r.confirmed_at,
    sort_order: r.sort_order,
    created_at: r.created_at,
  }));

  const { error: upErr } = await admin.from("nodes").upsert(upsertRows);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await admin
    .from("nodes")
    .update({ confirmed: false, confirmed_at: null })
    .eq("id", parent.id);

  await admin
    .from("items")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", itemId);

  return NextResponse.json({
    weights: next,
    parent_confirmed: false,
  });
}
