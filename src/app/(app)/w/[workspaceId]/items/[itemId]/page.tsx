import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemWorkspace } from "@/components/item/item-workspace";
import { createClient } from "@/lib/supabase/server";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ workspaceId: string; itemId: string }>;
}) {
  const { workspaceId, itemId } = await params;
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

  const { data: item } = await supabase
    .from("items")
    .select("id, workspace_id, title")
    .eq("id", itemId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!item) notFound();

  return (
    <main className="space-y-4">
      <Link
        href={`/w/${workspaceId}`}
        className="text-sm text-sea hover:text-sea-deep"
      >
        ← Workspace
      </Link>
      <ItemWorkspace itemId={itemId} />
    </main>
  );
}
