import { NextResponse } from "next/server";
import { z } from "zod";
import { childrenOf } from "@/lib/engine/tree";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  confirmed: z.boolean(),
});

export async function POST(
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

  const parent = loaded.rows.find((r) => r.id === nodeId);
  if (!parent) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  const kids = childrenOf(loaded.rows, nodeId);
  if (kids.length === 0) {
    return NextResponse.json(
      { error: "Node has no children-set to confirm" },
      { status: 400 },
    );
  }

  if (parent.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the section owner can confirm this set" },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const confirmed = parsed.data.confirmed;
  const admin = createAdminClient();
  const { error } = await admin
    .from("nodes")
    .update({
      confirmed,
      confirmed_at: confirmed ? new Date().toISOString() : null,
    })
    .eq("id", nodeId)
    .eq("item_id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("items")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", itemId);

  return NextResponse.json({ confirmed });
}
