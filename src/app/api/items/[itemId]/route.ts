import { NextResponse } from "next/server";
import { buildItemView } from "@/lib/engine/item-view";
import { loadItemForMember } from "@/lib/items/load";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const view = buildItemView(
    loaded.item,
    loaded.rows,
    user.id,
    loaded.nameById,
    loaded.members,
    loaded.actionNotes,
  );
  return NextResponse.json(view);
}
