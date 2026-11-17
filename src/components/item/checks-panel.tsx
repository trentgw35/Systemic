"use client";

import { useEffect, useState } from "react";
import type { ChecksSnapshot } from "@/lib/engine/checks";
import type { ItemMode } from "@/lib/types";

function stateClass(state: string) {
  if (state === "Check") return "text-danger";
  if (state === "Borderline") return "text-amber-800";
  return "text-ok";
}

export function ChecksPanel({
  checks,
  itemTitle,
  mode,
}: {
  checks: ChecksSnapshot;
  itemTitle: string;
  mode: ItemMode;
}) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [interp, setInterp] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then((b) => {
        setAiEnabled(!!b.enabled);
        setAiConfigured(!!b.configured);
      })
      .catch(() => undefined);
  }, []);

  async function interpret(checkId: string, title: string, detail: string) {
    setLoadingId(checkId);
    try {
      if (!aiConfigured) {
        setInterp((prev) => ({
          ...prev,
          [checkId]: "AI drafting isn’t configured",
        }));
        return;
      }
      const res = await fetch("/api/ai/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_title: title,
          check_detail: detail,
          item_title: itemTitle,
          mode,
        }),
      });
      const body = await res.json().catch(() => ({}));
      setInterp((prev) => ({
        ...prev,
        [checkId]:
          body.interpretation ??
          body.message ??
          "AI drafting isn’t configured",
      }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section>
      <h2 className="font-display text-xl text-ink">Things to check</h2>
      <p className="mt-1 text-xs text-ink-soft">
        These are fixed rules calculated from the tree — not AI opinions.
      </p>
      {checks.all_clear ? (
        <p className="mt-2 text-sm font-medium text-ok">Looks good</p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {checks.checks.map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-line bg-white/55 px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-ink">{c.title}</span>
              <span
                className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${stateClass(c.state)}`}
              >
                {c.state}
              </span>
            </div>
            {c.detail && (
              <p className="mt-1 text-sm text-ink-soft">{c.detail}</p>
            )}
            {aiEnabled && c.state === "Check" && (
              <div className="mt-2 border-t border-dashed border-line pt-2">
                <button
                  type="button"
                  disabled={loadingId === c.id}
                  onClick={() =>
                    void interpret(c.id, c.title, c.detail ?? "")
                  }
                  className="text-xs font-semibold text-sea hover:text-sea-deep disabled:opacity-50"
                >
                  {loadingId === c.id
                    ? "Interpreting…"
                    : "Optional interpretation"}
                </button>
                {interp[c.id] && (
                  <p className="mt-1 rounded bg-paper-deep/60 px-2 py-1.5 text-xs italic text-ink-soft">
                    <span className="not-italic font-semibold">
                      Interpretation:{" "}
                    </span>
                    {interp[c.id]}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
