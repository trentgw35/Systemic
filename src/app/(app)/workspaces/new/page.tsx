import { CreateWorkspaceForm } from "@/components/create-workspace-form";

export default function NewWorkspacePage() {
  return (
    <main className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-3xl text-ink">New workspace</h1>
      <p className="text-ink-soft">
        A workspace is your team’s shared home for decisions and root-cause
        records.
      </p>
      <CreateWorkspaceForm />
    </main>
  );
}
