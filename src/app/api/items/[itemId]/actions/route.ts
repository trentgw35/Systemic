import { NextResponse } from "next/server";
import { z } from "zod";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  node_id: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
  owner_name: z.string().trim().min(1).max(200),
  due_date: z.string().nullable().optional(),
});

export async function POST(
  request: Request,
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
  if (loaded.item.mode !== "rcca") {
    return NextResponse.json(
      { error: "Actions are only for RCCA records" },
      { status: 400 },
    );
  }
  if (!loaded.item.locked_at) {
    return NextResponse.json(
      { error: "Lock in the record before adding actions" },
      { status: 409 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!loaded.rows.some((r) => r.id === parsed.data.node_id)) {
    return NextResponse.json({ error: "Cause not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("action_notes")
    .insert({
      item_id: itemId,
      node_id: parsed.data.node_id,
      text: parsed.data.text,
      owner_name: parsed.data.owner_name,
      due_date: parsed.data.due_date || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
