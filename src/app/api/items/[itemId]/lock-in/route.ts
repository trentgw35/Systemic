import { NextResponse } from "next/server";
import {
  computeChecks,
  confirmationsList,
  lockStampForUnconfirmedShare,
} from "@/lib/engine/checks";
import { confirmedSharePct } from "@/lib/engine/stats";
import { buildTree } from "@/lib/engine/tree";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
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

  if (loaded.item.created_by !== user.id) {
    return NextResponse.json(
      { error: "Only the item owner can lock in" },
      { status: 403 },
    );
  }
  if (loaded.item.locked_at) {
    return NextResponse.json({ error: "Already locked in" }, { status: 409 });
  }

  const tree = buildTree(loaded.rows);
  const confirmed = confirmedSharePct(tree);
  const unconfirmed = 100 - confirmed;
  const stamp = lockStampForUnconfirmedShare(unconfirmed);
  const checks = computeChecks(
    tree,
    loaded.item.mode,
    loaded.nameById,
    loaded.item.expected_areas,
  );
  const confirmations = confirmationsList(tree, loaded.nameById);
  const lockedAt = new Date().toISOString();

  const admin = createAdminClient();
  let { error } = await admin
    .from("items")
    .update({
      locked_at: lockedAt,
      lock_stamp: stamp,
      checks_snapshot: checks,
      confirmations_snapshot: confirmations,
      updated_at: lockedAt,
    })
    .eq("id", itemId)
    .is("locked_at", null);

  // Older DBs before migration 003: stamp without snapshot columns.
  if (error && /checks_snapshot|confirmations_snapshot|column/i.test(error.message)) {
    ({ error } = await admin
      .from("items")
      .update({
        locked_at: lockedAt,
        lock_stamp: stamp,
        updated_at: lockedAt,
      })
      .eq("id", itemId)
      .is("locked_at", null));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    locked_at: lockedAt,
    lock_stamp: stamp,
    checks,
  });
}
