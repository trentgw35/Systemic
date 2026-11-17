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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load item");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function lockIn() {
    if (!view || !confirm("Lock in this decision? It becomes read-only.")) {
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
        </div>
        {view.viewer_is_item_owner && !locked && (
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
        )}
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

      <FullPicture tree={tree} mode={item.mode} locked={locked} />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
