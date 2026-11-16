import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceHomePage({
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

  if (!membership) {
    // Server-side denial for non-members (Context 04 / M1 acceptance)
    notFound();
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .eq("id", workspaceId)
    .single();

  if (!workspace) notFound();

  const { data: items } = await supabase
    .from("items")
    .select(
      "id, title, mode, group_tag, created_at, updated_at, locked_at, lock_stamp",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const { data: members } = await supabase
    .from("memberships")
    .select("role, user_id, profiles(name, email)")
    .eq("workspace_id", workspaceId);

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">{workspace.name}</h1>
          <p className="text-sm text-ink-soft">
            Your role: {membership.role}
          </p>
        </div>
        {membership.role === "admin" && (
          <Link
            href={`/w/${workspaceId}/settings`}
            className="text-sm font-semibold text-sea hover:text-sea-deep"
          >
            Members & invites
          </Link>
        )}
      </div>

      <section>
        <h2 className="font-display text-xl text-ink">Items</h2>
        {!items?.length ? (
          <p className="mt-2 rounded-md border border-dashed border-line bg-white/40 p-4 text-sm text-ink-soft">
            No items in this workspace yet. Demo seeds appear when you create a
            workspace with demos enabled. Creating new decisions arrives in
            Milestone 2.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white/50">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="font-medium text-ink">{item.title}</div>
                <div className="text-sm text-ink-soft">
                  {item.mode === "rcca" ? "What went wrong" : "Decision"}
                  {" · "}
                  {item.lock_stamp ?? "In progress"}
                  {item.group_tag ? ` · ${item.group_tag}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl text-ink">Members</h2>
        <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white/50">
          {members?.map((m) => {
            const profile = m.profiles as unknown as {
              name: string;
              email: string;
            } | null;
            return (
              <li key={m.user_id} className="px-4 py-3 text-sm">
                <div className="font-medium text-ink">
                  {profile?.name || profile?.email || m.user_id}
                </div>
                <div className="text-ink-soft">
                  {profile?.email} · {m.role}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
