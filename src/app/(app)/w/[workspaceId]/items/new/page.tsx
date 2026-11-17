import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateItemForm } from "@/components/create-item-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewItemPage({
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

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .single();
  if (!workspace) notFound();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("user_id, profiles(id, name, email)")
    .eq("workspace_id", workspaceId);

  const members =
    memberships
      ?.map((m) => {
        const p = m.profiles as unknown as {
          id: string;
          name: string;
          email: string;
        } | null;
        return p
          ? { id: p.id, name: p.name, email: p.email }
          : { id: m.user_id, name: "", email: "" };
      })
      .filter((m) => m.id) ?? [];

  return (
    <main className="space-y-6">
      <div>
        <Link
          href={`/w/${workspaceId}`}
          className="text-sm text-sea hover:text-sea-deep"
        >
          ← {workspace.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">New item</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Start a decision or an RCCA, assign sections, and start weighting.
        </p>
      </div>
      <CreateItemForm
        workspaceId={workspaceId}
        members={members}
        currentUserId={user!.id}
      />
    </main>
  );
}
