import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("workspace_id, role, workspaces(id, name)")
    .eq("user_id", user.id);

  const workspaces =
    memberships
      ?.map((m) => {
        const ws = m.workspaces as unknown as { id: string; name: string } | null;
        return ws ? { id: ws.id, name: ws.name } : null;
      })
      .filter(Boolean) ?? [];

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/app" className="font-display text-2xl text-ink">
            Systemic
          </Link>
          <p className="text-sm text-ink-soft">
            {user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <WorkspaceSwitcher workspaces={workspaces as { id: string; name: string }[]} />
          <Link
            href="/workspaces/new"
            className="text-sm font-medium text-sea hover:text-sea-deep"
          >
            New workspace
          </Link>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
