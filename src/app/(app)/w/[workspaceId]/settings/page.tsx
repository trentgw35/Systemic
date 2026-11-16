import { notFound, redirect } from "next/navigation";
import { InvitePanel } from "@/components/invite-panel";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!membership) notFound();
  if (membership.role !== "admin") redirect(`/w/${workspaceId}`);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const { data: invites } = await supabase
    .from("workspace_invites")
    .select("id, email, token, role, accepted_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">
          {workspace?.name ?? "Workspace"} settings
        </h1>
        <p className="text-ink-soft">Manage members and invites.</p>
      </div>
      <InvitePanel
        workspaceId={workspaceId}
        initialInvites={invites ?? []}
      />
    </main>
  );
}
