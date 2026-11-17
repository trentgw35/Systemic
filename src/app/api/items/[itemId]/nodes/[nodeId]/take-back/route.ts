import { NextResponse } from "next/server";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
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

  const node = loaded.rows.find((r) => r.id === nodeId);
  if (!node) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (node.delegated_from !== user.id) {
    return NextResponse.json(
      { error: "Only the delegator can take this back" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("nodes")
    .update({
      owner_id: node.delegated_from,
      delegated_from: null,
      confirmed: false,
      confirmed_at: null,
    })
    .eq("id", nodeId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (node.parent_id) {
    await admin
      .from("nodes")
      .update({ confirmed: false, confirmed_at: null })
      .eq("id", node.parent_id);
  }
  await admin
    .from("items")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", itemId);

  return NextResponse.json({ ok: true });
}
