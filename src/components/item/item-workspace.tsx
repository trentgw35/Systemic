"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemViewResponse } from "@/lib/engine/item-view";
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

  const { item, stats, stats_labels, tree } = view;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          {item.mode === "rcca" ? "What went wrong" : "Decision"}
          {item.group_tag ? ` · ${item.group_tag}` : ""}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink">{item.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Created {formatWhen(item.created_at)}
          {" · "}
          Last edited {formatWhen(item.updated_at)}
        </p>
      </header>

      <StatsStrip stats={stats} labels={stats_labels} />

      <YourSection view={view} onChanged={load} />

      <FullPicture tree={tree} mode={item.mode} />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
