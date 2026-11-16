import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createDemoWorkspace, seedDemoItems } from "@/lib/seed-workspace";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const seedDemo = Boolean(body.seedDemo);
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  // Ensure profile exists (trigger should have created it)
  const admin = createAdminClient();
  await admin.from("profiles").upsert({
    id: user.id,
    email: user.email ?? "",
    name:
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split("@")[0] ||
      "",
  });

  if (seedDemo) {
    try {
      const id = await createDemoWorkspace(admin, user.id, name);
      return NextResponse.json({ id });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Seed failed" },
        { status: 500 },
      );
    }
  }

  const { data: wsId, error } = await supabase.rpc("create_workspace", {
    ws_name: name,
    seed_demo: false,
  });

  if (error) {
    // Fallback via service role if RPC not yet applied
    try {
      const { data: ws, error: wErr } = await admin
        .from("workspaces")
        .insert({ name, created_by: user.id })
        .select("id")
        .single();
      if (wErr || !ws) throw wErr ?? new Error("workspace insert failed");
      const { error: mErr } = await admin.from("memberships").insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: "admin",
      });
      if (mErr) throw mErr;
      return NextResponse.json({ id: ws.id });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            error.message ||
            (e instanceof Error ? e.message : "Could not create workspace"),
        },
        { status: 500 },
      );
    }
  }

  if (seedDemo && wsId) {
    try {
      await seedDemoItems(admin, wsId as string, user.id);
    } catch (e) {
      return NextResponse.json(
        {
          id: wsId,
          warning: e instanceof Error ? e.message : "Demo seed failed",
        },
        { status: 201 },
      );
    }
  }

  return NextResponse.json({ id: wsId });
}
