"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemViewResponse } from "@/lib/engine/item-view";
import { ChecksPanel } from "./checks-panel";
import { FullPicture } from "./full-picture";
import { StatsStrip } from "./stats-strip";
import { YourSection } from "./your-section";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ItemWorkspace({ itemId }: { itemId: string }) {
  const [view, setView] = useState<ItemViewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [actionText, setActionText] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionNode, setActionNode] = useState("");
  const [actionDue, setActionDue] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/items/${itemId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load (${res.status})`);
      }
      const data = (await res.json()) as ItemViewResponse;
      setView(data);
      if (!actionOwner && data.members[0]) {
        setActionOwner(data.members[0].name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }, [itemId, actionOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lockIn() {
    if (
      !view ||
      !confirm(
        view.item.mode === "rcca"
          ? "Lock in this record? It becomes read-only."
          : "Lock in this decision? It becomes read-only.",
      )
    ) {
      return;
    }
    setLocking(true);
    setError("");
    try {
      const res = await fetch(`/api/items/${itemId}/lock-in`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Lock-in failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lock-in failed");
    } finally {
      setLocking(false);
    }
  }

  async function addSection() {
    if (!view) return;
    const label = window.prompt(
      view.item.mode === "rcca" ? "New cause area" : "New section name",
    );
    if (!label?.trim()) return;
    const owner =
      view.members.find((m) => m.id)?.id ?? view.item.created_by;
    const res = await fetch(`/api/items/${itemId}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_section",
        label: label.trim(),
        owner_id: owner,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not add section");
      return;
    }
    await load();
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionNode || !actionText.trim() || !actionOwner.trim()) return;
    const res = await fetch(`/api/items/${itemId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node_id: actionNode,
        text: actionText.trim(),
        owner_name: actionOwner.trim(),
        due_date: actionDue || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not add action");
      return;
    }
    setActionText("");
    setActionDue("");
    await load();
  }

  if (loading && !view) {
    return <p className="text-ink-soft">Loading item…</p>;
  }
  if (error && !view) {
    return (
      <p className="text-danger" role="alert">
        {error}
      </p>
    );
  }
  if (!view) return null;

  const { item, stats, stats_labels, tree, checks, confirmations } = view;
  const locked = Boolean(item.locked_at);

  // Flatten visible causes for action picker
  const causeOptions: Array<{ id: string; label: string; share: number }> = [];
  function walkCauses(
    nodes: typeof tree,
    prefix = "",
  ) {
    for (const n of nodes) {
      if (n.kind === "hidden") continue;
      const label = prefix ? `${prefix} › ${n.label}` : n.label;
      causeOptions.push({
        id: n.id,
        label,
        share: n.share_of_whole,
      });
      walkCauses(n.children, label);
    }
  }
  if (locked && item.mode === "rcca") walkCauses(tree);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            {item.mode === "rcca" ? "What went wrong" : "Decision"}
            {item.group_tag ? ` · ${item.group_tag}` : ""}
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink">{item.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Created {formatWhen(item.created_at)}
            {" · "}
            Last edited {formatWhen(item.updated_at)}
            {item.locked_at
              ? ` · Locked in ${formatWhen(item.locked_at)}`
              : ""}
          </p>
          {item.lock_stamp && (
            <p className="mt-2 text-sm font-semibold text-ink">
              {item.lock_stamp}
            </p>
          )}
          {view.actions_coverage_pct != null && (
            <p className="mt-2 text-sm font-medium text-sea-deep">
              Actions address {view.actions_coverage_pct}% of the explanation
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {view.viewer_is_item_owner && !locked && (
            <>
              <button
                type="button"
                onClick={() => void lockIn()}
                disabled={locking}
                className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-sea-deep disabled:opacity-60"
              >
                {locking
                  ? "Locking in…"
                  : item.mode === "rcca"
                    ? "Lock in the record"
                    : "Lock in the decision"}
              </button>
              <button
                type="button"
                onClick={() => void addSection()}
                className="text-sm font-semibold text-sea hover:text-sea-deep"
              >
                {item.mode === "rcca" ? "Add cause area" : "Add section"}
              </button>
            </>
          )}
        </div>
      </header>

      <StatsStrip stats={stats} labels={stats_labels} />

      <ChecksPanel checks={checks} />

      {!locked && <YourSection view={view} onChanged={load} />}

      {locked && (
        <section>
          <h2 className="font-display text-xl text-ink">Who confirmed what</h2>
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-white/50">
            {confirmations.map((c) => (
              <li key={c.node_id} className="px-4 py-3 text-sm">
                <div className="font-medium text-ink">
                  {c.label}{" "}
                  <span className="font-normal text-ink-soft">
                    ({c.share_of_whole.toFixed(1)}%)
                  </span>
                </div>
                <div className="text-ink-soft">
                  {c.confirmed
                    ? `Confirmed${c.owner_name ? ` by ${c.owner_name}` : ""}${c.confirmed_at ? ` · ${formatWhen(c.confirmed_at)}` : ""}`
                    : "Not yet confirmed"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked && item.mode === "rcca" && (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">Corrective actions</h2>
          {view.actions.length > 0 && (
            <ul className="divide-y divide-line rounded-md border border-line bg-white/50">
              {view.actions.map((a) => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <div className="font-medium text-ink">{a.node_label}</div>
                  <div className="text-ink-soft">
                    {a.text} · {a.owner_name}
                    {a.due_date ? ` · due ${a.due_date}` : ""} ·{" "}
                    {a.share_of_whole.toFixed(1)}%
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addAction} className="space-y-3 rounded-md border border-line bg-white/40 p-4">
            <label className="block text-sm font-medium">
              Cause
              <select
                required
                value={actionNode}
                onChange={(e) => setActionNode(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              >
                <option value="">Select…</option>
                {causeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.share.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Action
              <input
                required
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Owner
              <input
                required
                value={actionOwner}
                onChange={(e) => setActionOwner(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Due date
              <input
                type="date"
                value={actionDue}
                onChange={(e) => setActionDue(e.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-sea px-4 py-2 text-sm font-semibold text-white hover:bg-sea-deep"
            >
              Attach action
            </button>
          </form>
        </section>
      )}

      <FullPicture tree={tree} mode={item.mode} locked={locked} />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
