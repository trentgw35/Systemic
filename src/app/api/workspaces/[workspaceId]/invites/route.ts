import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  const linkOnly = Boolean(body.linkOnly);

  if (!email && !linkOnly) {
    return NextResponse.json(
      { error: "Provide an email or request a link" },
      { status: 400 },
    );
  }

  const token = randomBytes(24).toString("hex");
  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      email: linkOnly ? null : email,
      token,
      role: "member",
      created_by: user.id,
    })
    .select("id, email, token, role, accepted_at, created_at")
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create invite" },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    "";
  const url = `${origin}/invite/${token}`;

  return NextResponse.json({ invite, url });
}
