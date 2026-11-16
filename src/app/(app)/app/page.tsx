import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("memberships")
    .select("workspace_id, workspaces(id, name)")
    .eq("user_id", user!.id);

  const workspaces =
    memberships
      ?.map((m) => m.workspaces as unknown as { id: string; name: string })
      .filter(Boolean) ?? [];

  const workspaceIds = workspaces.map((w) => w.id);
  const { data: items } =
    workspaceIds.length > 0
      ? await supabase
          .from("items")
          .select(
            "id, title, mode, group_tag, workspace_id, created_at, locked_at, lock_stamp, updated_at",
          )
          .in("workspace_id", workspaceIds)
          .order("updated_at", { ascending: false })
      : { data: [] as Array<Record<string, unknown>> };

  const byWorkspace = new Map<string, string>();
  workspaces.forEach((w) => byWorkspace.set(w.id, w.name));

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Library</h1>
        <p className="mt-1 text-ink-soft">
          Items across your workspaces. The contribution engine arrives in the
          next milestone — for now, open a workspace to invite teammates and
          review demo records.
        </p>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white/40 p-6">
          <p className="text-ink">No workspaces yet.</p>
          <Link
            href="/workspaces/new"
            className="mt-3 inline-block text-sm font-semibold text-sea hover:text-sea-deep"
          >
            Create your first workspace
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {workspaces.map((w) => (
            <li key={w.id}>
              <Link
                href={`/w/${w.id}`}
                className="block rounded-md border border-line bg-white/60 px-4 py-3 transition hover:border-sea/40 hover:bg-white"
              >
                <div className="font-medium text-ink">{w.name}</div>
                <div className="text-sm text-ink-soft">Open workspace</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="font-display text-xl text-ink">Recent items</h2>
        {!items?.length ? (
          <p className="mt-2 text-sm text-ink-soft">
            No items yet. Create a workspace with demo items, or wait for the
            decision engine in Milestone 2.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white/50">
            {items.map((item) => (
              <li key={item.id as string} className="px-4 py-3">
                <div className="font-medium text-ink">{item.title as string}</div>
                <div className="text-sm text-ink-soft">
                  {(item.mode as string) === "rcca"
                    ? "What went wrong"
                    : "Decision"}
                  {" · "}
                  {byWorkspace.get(item.workspace_id as string) ?? "Workspace"}
                  {" · "}
                  {(item.lock_stamp as string) ?? "In progress"}
                  {item.group_tag ? ` · ${item.group_tag}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
