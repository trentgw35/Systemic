import { NextResponse } from "next/server";
import { z } from "zod";
import { planBreakDown } from "@/lib/engine/structure";
import { childrenOf } from "@/lib/engine/tree";
import { applyStructureMutation } from "@/lib/items/apply-structure";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  to_user_id: z.string().uuid(),
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

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (parsed.data.to_user_id === user.id) {
    return NextResponse.json(
      { error: "Self-delegation is not allowed" },
      { status: 400 },
    );
  }
  if (!loaded.members.some((m) => m.id === parsed.data.to_user_id)) {
    return NextResponse.json(
      { error: "Delegatee must be a workspace member" },
      { status: 400 },
    );
  }

  const node = loaded.rows.find((r) => r.id === nodeId);
  if (!node) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!node.parent_id) {
    return NextResponse.json(
      { error: "Delegate an input inside your section, not a Level-1 section" },
      { status: 400 },
    );
  }

  const parent = loaded.rows.find((r) => r.id === node.parent_id);
  if (!parent || parent.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const kids = childrenOf(loaded.rows, nodeId);

  try {
    if (kids.length === 0) {
      // Leaf: break down first, then transfer ownership of the new set
      const mutation = planBreakDown(loaded.rows, nodeId, parsed.data.to_user_id);
      // planBreakDown sets owner to actor — override to delegatee + delegated_from
      mutation.upsert = mutation.upsert.map((r) =>
        r.id === nodeId
          ? {
              ...r,
              owner_id: parsed.data.to_user_id,
              delegated_from: user.id,
              confirmed: false,
              confirmed_at: null,
            }
          : r,
      );
      await applyStructureMutation(admin, itemId, mutation);
    } else {
      // Existing sub-tree: transfer ownership only
      if (node.owner_id !== user.id) {
        return NextResponse.json(
          { error: "Only the current set owner can delegate it" },
          { status: 403 },
        );
      }
      const { error } = await admin
        .from("nodes")
        .update({
          owner_id: parsed.data.to_user_id,
          delegated_from: user.id,
          confirmed: false,
          confirmed_at: null,
        })
        .eq("id", nodeId);
      if (error) throw new Error(error.message);
      await admin
        .from("nodes")
        .update({ confirmed: false, confirmed_at: null })
        .eq("id", node.parent_id);
      await admin
        .from("items")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", itemId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delegate failed" },
      { status: 500 },
    );
  }
}
