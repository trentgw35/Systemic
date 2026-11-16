"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; name: string };

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: Option[];
  currentId?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-soft">
      Workspace
      <select
        className="max-w-full truncate rounded-md border border-line bg-white/70 px-2 py-2 text-sm text-ink"
        value={currentId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          if (id) router.push(`/w/${id}`);
          else router.push("/app");
        }}
      >
        <option value="">All workspaces</option>
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>
  );
}
