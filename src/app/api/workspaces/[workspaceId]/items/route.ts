import { NextResponse } from "next/server";
import { z } from "zod";
import { equalShares } from "@/lib/engine/weights";
import { requireWorkspaceMember } from "@/lib/items/load";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  group_tag: z.string().trim().max(100).optional().nullable(),
  mode: z.enum(["decision", "rcca"]).default("decision"),
  sections: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        owner_id: z.string().uuid(),
      }),
    )
    .min(2)
    .max(6),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await requireWorkspaceMember(
    supabase,
    workspaceId,
    user.id,
  );
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, group_tag, mode, sections } = parsed.data;

  // Every section owner must be a workspace member
  const ownerIds = [...new Set(sections.map((s) => s.owner_id))];
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .in("user_id", ownerIds);
  const memberSet = new Set((members ?? []).map((m) => m.user_id));
  if (ownerIds.some((id) => !memberSet.has(id))) {
    return NextResponse.json(
      { error: "Every section owner must be a workspace member" },
      { status: 400 },
    );
  }

  const { data: item, error: itemErr } = await supabase
    .from("items")
    .insert({
      workspace_id: workspaceId,
      mode,
      title,
      group_tag: group_tag || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (itemErr || !item) {
    return NextResponse.json(
      { error: itemErr?.message ?? "Failed to create item" },
      { status: 500 },
    );
  }

  const sectionWeights = equalShares(sections.length);
  const sectionRows = sections.map((s, i) => ({
    item_id: item.id,
    parent_id: null as string | null,
    label: s.name,
    kind: "process" as const,
    local_weight: sectionWeights[i],
    owner_id: s.owner_id,
    confirmed: false,
    confirmed_at: null as string | null,
    sort_order: i,
  }));

  const { data: sectionNodes, error: secErr } = await supabase
    .from("nodes")
    .insert(sectionRows)
    .select("id");

  if (secErr || !sectionNodes || sectionNodes.length !== sections.length) {
    await supabase.from("items").delete().eq("id", item.id);
    return NextResponse.json(
      { error: secErr?.message ?? "Failed to create sections" },
      { status: 500 },
    );
  }

  // Two starter inputs per section at 50/50, opinion, un-confirmed
  const starterKind = "opinion" as const;
  for (let i = 0; i < sectionNodes.length; i++) {
    const parentId = sectionNodes[i].id;
    const { error: childErr } = await supabase.from("nodes").insert([
      {
        item_id: item.id,
        parent_id: parentId,
        label: "Starter input A",
        kind: starterKind,
        local_weight: 50,
        owner_id: null,
        confirmed: false,
        sort_order: 0,
      },
      {
        item_id: item.id,
        parent_id: parentId,
        label: "Starter input B",
        kind: starterKind,
        local_weight: 50,
        owner_id: null,
        confirmed: false,
        sort_order: 1,
      },
    ]);
    if (childErr) {
      await supabase.from("items").delete().eq("id", item.id);
      return NextResponse.json(
        { error: childErr.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ id: item.id }, { status: 201 });
}
