"use client";

import type { ItemViewResponse } from "@/lib/engine/item-view";

export function StatsStrip({
  stats,
  labels,
}: {
  stats: ItemViewResponse["stats"];
  labels: ItemViewResponse["stats_labels"];
}) {
  const cells = [
    {
      label: labels.opinion,
      value: `${stats.personal_opinion_pct}%`,
    },
    {
      label: labels.data,
      value: `${stats.data_analysis_pct}%`,
    },
    {
      label: labels.confirmed,
      value: `${stats.confirmed_so_far_pct}%`,
    },
    {
      label: labels.total,
      value: `${stats.total_check_pct}%`,
    },
    {
      label: labels.status,
      value: stats.status,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-md border border-line bg-white/55 p-3 sm:grid-cols-5">
      {cells.map((c) => (
        <div key={c.label}>
          <dt className="text-[11px] uppercase tracking-wide text-ink-soft">
            {c.label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
