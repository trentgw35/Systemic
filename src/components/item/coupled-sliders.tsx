"use client";

import { useEffect, useState } from "react";
import { evidenceLabel } from "@/lib/engine/kinds";
import { redistributeWeights } from "@/lib/engine/weights";
import type { ItemMode } from "@/lib/types";

export type SliderChild = {
  id: string;
  label: string;
  evidence_kind: Parameters<typeof evidenceLabel>[0];
  local_weight: number;
  share_of_whole: number;
  has_children: boolean;
};

export function CoupledSliders({
  itemId,
  parentId,
  sectionShare,
  inputs,
  mode,
  localLabel,
  wholeLabel,
  confirmed,
  onChanged,
}: {
  itemId: string;
  parentId: string;
  sectionShare: number;
  inputs: SliderChild[];
  mode: ItemMode;
  localLabel: string;
  wholeLabel: string;
  confirmed: boolean;
  onChanged: () => void;
}) {
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [local, setLocal] = useState(inputs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    setLocal(inputs);
  }, [inputs]);

  function togglePin(id: string) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function preview(targetId: string, weight: number) {
    const rows = redistributeWeights(
      local.map((c) => ({ id: c.id, local_weight: c.local_weight })),
      targetId,
      weight,
      [...pinned],
    );
    const byId = new Map(rows.map((r) => [r.id, r.local_weight]));
    setLocal((prev) =>
      prev.map((c) => {
        const lw = byId.get(c.id) ?? c.local_weight;
        return {
          ...c,
          local_weight: lw,
          share_of_whole: (sectionShare * lw) / 100,
        };
      }),
    );
  }

  async function commit(targetId: string, weight: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/items/${itemId}/nodes/${targetId}/weight`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight,
            pinned_sibling_ids: [...pinned],
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not update weight");
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setLocal(inputs);
    } finally {
      setBusy(false);
    }
  }

  async function setConfirmed(next: boolean) {
    setConfirmBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/items/${itemId}/nodes/${parentId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: next }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not update confirmation");
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {local.map((child) => (
          <li
            key={child.id}
            className="rounded-md border border-line bg-white/60 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-ink">{child.label}</div>
                <div className="text-xs text-ink-soft">
                  {evidenceLabel(child.evidence_kind, mode)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => togglePin(child.id)}
                className={`shrink-0 rounded border px-2 py-1 text-xs font-medium ${
                  pinned.has(child.id)
                    ? "border-sea bg-sea/10 text-sea-deep"
                    : "border-line text-ink-soft"
                }`}
                aria-pressed={pinned.has(child.id)}
              >
                {pinned.has(child.id) ? "Pinned" : "Pin"}
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={child.local_weight}
              disabled={busy || pinned.has(child.id)}
              aria-label={`${child.label} weight within your section`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(child.local_weight.toFixed(1))}
              aria-valuetext={`${child.local_weight.toFixed(1)} percent within section, ${child.share_of_whole.toFixed(1)} percent of the whole`}
              onChange={(e) => preview(child.id, Number(e.target.value))}
              onMouseUp={(e) =>
                commit(child.id, Number((e.target as HTMLInputElement).value))
              }
              onTouchEnd={(e) =>
                commit(
                  child.id,
                  Number((e.target as HTMLInputElement).value),
                )
              }
              onKeyUp={(e) => {
                if (
                  e.key === "ArrowLeft" ||
                  e.key === "ArrowRight" ||
                  e.key === "Home" ||
                  e.key === "End"
                ) {
                  commit(
                    child.id,
                    Number((e.target as HTMLInputElement).value),
                  );
                }
              }}
              onBlur={(e) => commit(child.id, Number(e.target.value))}
              className="mt-3 w-full accent-[var(--sea)]"
            />

            <div className="mt-2 flex justify-between text-xs text-ink-soft">
              <span>
                {localLabel}:{" "}
                <strong className="text-ink">
                  {child.local_weight.toFixed(1)}%
                </strong>
              </span>
              <span>
                {wholeLabel}:{" "}
                <strong className="text-ink">
                  {child.share_of_whole.toFixed(1)}%
                </strong>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={confirmBusy || confirmed}
          onClick={() => setConfirmed(true)}
          className="rounded-md bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-50"
        >
          Confirm this section
        </button>
        <span
          className={`text-sm font-medium ${confirmed ? "text-ok" : "text-ink-soft"}`}
        >
          {confirmed ? "Confirmed" : "Not yet confirmed"}
        </span>
        {confirmed && (
          <button
            type="button"
            disabled={confirmBusy}
            onClick={() => setConfirmed(false)}
            className="text-xs text-ink-soft underline"
          >
            Clear confirmation
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
