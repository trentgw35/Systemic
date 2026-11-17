import { NextResponse } from "next/server";
import { z } from "zod";
import {
  planAddInput,
  planBreakDown,
  planRemoveInput,
} from "@/lib/engine/structure";
import { childrenOf } from "@/lib/engine/tree";
import { applyStructureMutation } from "@/lib/items/apply-structure";
import { loadItemForMember } from "@/lib/items/load";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EvidenceKind, NodeRow } from "@/lib/types";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_input"),
    parent_id: z.string().uuid(),
    label: z.string().trim().min(1).max(200).default("New input"),
    kind: z
      .enum(["opinion", "anecdote", "advisory", "data", "process"])
      .default("opinion"),
  }),
  z.object({
    action: z.literal("remove_input"),
    node_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("rename"),
    node_id: z.string().uuid(),
    label: z.string().trim().min(1).max(200),
  }),
  z.object({
    action: z.literal("set_kind"),
    node_id: z.string().uuid(),
    kind: z.enum(["opinion", "anecdote", "advisory", "data", "process"]),
  }),
  z.object({
    action: z.literal("break_down"),
    node_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("add_section"),
    label: z.string().trim().min(1).max(100),
    owner_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("remove_section"),
    node_id: z.string().uuid(),
  }),
  z.object({
    action: z.literal("assign_section_owner"),
    node_id: z.string().uuid(),
    owner_id: z.string().uuid(),
  }),
]);

function setOwnerOfParent(rows: NodeRow[], parentId: string | null) {
  if (!parentId) return null;
  return rows.find((r) => r.id === parentId)?.owner_id ?? null;
}

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
  if (loaded.item.locked_at) {
    return NextResponse.json({ error: "Item is locked in" }, { status: 409 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const body = parsed.data;

  try {
    if (body.action === "add_input") {
      const parent = loaded.rows.find((r) => r.id === body.parent_id);
      if (!parent || parent.owner_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const { mutation } = planAddInput(
        loaded.rows,
        itemId,
        body.parent_id,
        body.label,
        body.kind as EvidenceKind,
        null,
      );
      await applyStructureMutation(admin, itemId, mutation);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove_input") {
      const node = loaded.rows.find((r) => r.id === body.node_id);
      if (!node?.parent_id) {
        return NextResponse.json({ error: "Use remove_section" }, { status: 400 });
      }
      const parentOwner = setOwnerOfParent(loaded.rows, node.parent_id);
      if (parentOwner !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Cannot remove if node itself is delegated away (owned by someone else)
      if (node.owner_id && node.owner_id !== user.id && childrenOf(loaded.rows, node.id).length) {
        return NextResponse.json(
          { error: "Delegated set — take back first" },
          { status: 403 },
        );
      }
      const mutation = planRemoveInput(loaded.rows, body.node_id);
      await applyStructureMutation(admin, itemId, mutation);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "rename" || body.action === "set_kind") {
      const node = loaded.rows.find((r) => r.id === body.node_id);
      if (!node) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const parentOwner = node.parent_id
        ? setOwnerOfParent(loaded.rows, node.parent_id)
        : loaded.item.created_by;
      // Rename L1: item owner; rename child: set owner
      const allowed =
        node.parent_id == null
          ? loaded.item.created_by === user.id
          : parentOwner === user.id;
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        node.parent_id &&
        node.owner_id &&
        node.owner_id !== user.id &&
        childrenOf(loaded.rows, node.id).length
      ) {
        return NextResponse.json(
          { error: "Delegated set — take back first" },
          { status: 403 },
        );
      }
      const patch =
        body.action === "rename"
          ? { label: body.label }
          : { kind: body.kind };
      const { error } = await admin
        .from("nodes")
        .update(patch)
        .eq("id", body.node_id);
      if (error) throw new Error(error.message);
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

    if (body.action === "break_down") {
      const node = loaded.rows.find((r) => r.id === body.node_id);
      if (!node?.parent_id) {
        return NextResponse.json({ error: "Not a leaf in a section" }, { status: 400 });
      }
      const parentOwner = setOwnerOfParent(loaded.rows, node.parent_id);
      if (parentOwner !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const mutation = planBreakDown(loaded.rows, body.node_id, user.id);
      await applyStructureMutation(admin, itemId, mutation);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "add_section") {
      if (loaded.item.created_by !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const l1 = childrenOf(loaded.rows, null);
      if (l1.length >= 6) {
        return NextResponse.json({ error: "At most 6 sections" }, { status: 400 });
      }
      if (!loaded.members.some((m) => m.id === body.owner_id)) {
        return NextResponse.json({ error: "Owner must be a member" }, { status: 400 });
      }
      const { mutation, newNodeId } = planAddInput(
        loaded.rows,
        itemId,
        null,
        body.label,
        "process",
        body.owner_id,
      );
      // Starters under new section
      await applyStructureMutation(admin, itemId, mutation);
      const starters = [
        {
          item_id: itemId,
          parent_id: newNodeId,
          label: "Starter input A",
          kind: "opinion",
          local_weight: 50,
          owner_id: null,
          confirmed: false,
          sort_order: 0,
        },
        {
          item_id: itemId,
          parent_id: newNodeId,
          label: "Starter input B",
          kind: "opinion",
          local_weight: 50,
          owner_id: null,
          confirmed: false,
          sort_order: 1,
        },
      ];
      const { error } = await admin.from("nodes").insert(starters);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, id: newNodeId });
    }

    if (body.action === "remove_section") {
      if (loaded.item.created_by !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const node = loaded.rows.find((r) => r.id === body.node_id);
      if (!node || node.parent_id !== null) {
        return NextResponse.json({ error: "Not a Level-1 section" }, { status: 400 });
      }
      const l1 = childrenOf(loaded.rows, null);
      if (l1.length <= 2) {
        return NextResponse.json({ error: "Need at least 2 sections" }, { status: 400 });
      }
      const mutation = planRemoveInput(loaded.rows, body.node_id);
      await applyStructureMutation(admin, itemId, mutation);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "assign_section_owner") {
      if (loaded.item.created_by !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const node = loaded.rows.find((r) => r.id === body.node_id);
      if (!node || node.parent_id !== null) {
        return NextResponse.json({ error: "Not a Level-1 section" }, { status: 400 });
      }
      if (!loaded.members.some((m) => m.id === body.owner_id)) {
        return NextResponse.json({ error: "Owner must be a member" }, { status: 400 });
      }
      const { error } = await admin
        .from("nodes")
        .update({
          owner_id: body.owner_id,
          confirmed: false,
          confirmed_at: null,
        })
        .eq("id", body.node_id);
      if (error) throw new Error(error.message);
      await admin
        .from("items")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", itemId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mutation failed" },
      { status: 500 },
    );
  }
}
