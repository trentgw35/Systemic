"use client";

import type { ChecksSnapshot } from "@/lib/engine/checks";

function stateClass(state: string) {
  if (state === "Check") return "text-danger";
  if (state === "Borderline") return "text-amber-800";
  return "text-ok";
}

export function ChecksPanel({ checks }: { checks: ChecksSnapshot }) {
  return (
    <section>
      <h2 className="font-display text-xl text-ink">Things to check</h2>
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
          </li>
        ))}
      </ul>
    </section>
  );
}
