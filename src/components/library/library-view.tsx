"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export type LibraryItem = {
  id: string;
  title: string;
  mode: "decision" | "rcca";
  group_tag: string | null;
  workspace_id: string;
  workspace_name: string;
  created_by: string;
  owner_name: string;
  created_at: string;
  locked_at: string | null;
  lock_stamp: string | null;
  updated_at: string;
  status: string;
  confirmed_share: number | null;
  viewer_is_owner: boolean;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 10);
  }
}

export function LibraryView() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [workspaces, setWorkspaces] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | "decision" | "rcca">("all");
  const [status, setStatus] = useState<"all" | "in_progress" | "locked">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/library");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to load library");
      setItems(body.items ?? []);
      setWorkspaces(body.workspaces ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveGroupTag(itemId: string, current: string | null) {
    const next = window.prompt("Group tag", current ?? "");
    if (next === null) return;
    const tag = next.trim() || null;
    const res = await fetch(`/api/items/${itemId}/group-tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_tag: tag }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not update group");
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, group_tag: body.group_tag } : it,
      ),
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (mode !== "all" && it.mode !== mode) return false;
      if (status === "in_progress" && it.locked_at) return false;
      if (status === "locked" && !it.locked_at) return false;
      if (from && new Date(it.created_at) < new Date(from)) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (new Date(it.created_at) > end) return false;
      }
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.owner_name.toLowerCase().includes(q) ||
        (it.group_tag ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, mode, status, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const it of filtered) {
      const key = it.group_tag?.trim() || "No group";
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "No group") return 1;
      if (b === "No group") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  if (loading) {
    return <p className="text-ink-soft">Loading library…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Library</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every decision and record you can access, grouped by tag.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/workspaces/new"
            className="text-sm font-semibold text-sea hover:text-sea-deep"
          >
            New workspace
          </Link>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white/40 p-6">
          <p className="font-medium text-ink">No workspaces yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Create a workspace to invite teammates and start a decision.
          </p>
          <Link
            href="/workspaces/new"
            className="mt-3 inline-block text-sm font-semibold text-sea hover:text-sea-deep"
          >
            Create your first workspace
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-md border border-line bg-white/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-ink-soft sm:col-span-2">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, owner, or group"
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-sea focus:ring-2"
              />
            </label>
            <label className="block text-xs font-medium text-ink-soft">
              Mode
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "all" | "decision" | "rcca")
                }
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="decision">Decision</option>
                <option value="rcca">What went wrong</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-soft">
              Status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "all" | "in_progress" | "locked",
                  )
                }
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="in_progress">In progress</option>
                <option value="locked">Final (locked in)</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-soft">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-ink-soft">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-white/40 p-6 text-sm text-ink-soft">
              No items match. Open a workspace and create a decision, or clear
              filters.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([group, list]) => (
                <section key={group}>
                  <h2 className="font-display text-xl text-ink">{group}</h2>
                  <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white/55">
                    {list.map((it) => (
                      <li key={it.id} className="px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <Link
                            href={`/w/${it.workspace_id}/items/${it.id}`}
                            className="min-w-0 flex-1"
                          >
                            <div className="font-medium text-ink">
                              {it.title}
                            </div>
                            <div className="mt-1 text-sm text-ink-soft">
                              {it.mode === "rcca"
                                ? "What went wrong"
                                : "Decision"}
                              {" · "}
                              {it.group_tag || "No group"}
                              {" · "}
                              {it.owner_name}
                              {" · "}
                              {it.status}
                              {" · "}
                              {it.workspace_name}
                            </div>
                            <div className="mt-0.5 text-xs text-ink-soft">
                              Created {formatDate(it.created_at)}
                              {it.locked_at
                                ? ` · Locked in ${formatDate(it.locked_at)}`
                                : it.confirmed_share != null
                                  ? ` · Confirmed so far ${it.confirmed_share}%`
                                  : ""}
                            </div>
                          </Link>
                          {it.viewer_is_owner && (
                            <button
                              type="button"
                              onClick={() =>
                                void saveGroupTag(it.id, it.group_tag)
                              }
                              className="shrink-0 text-xs font-semibold text-sea hover:text-sea-deep"
                            >
                              Edit group
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
