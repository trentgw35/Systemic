"use client";

import type { MaskedNode } from "@/lib/engine/mask";
import { evidenceLabel } from "@/lib/engine/kinds";
import type { ItemMode } from "@/lib/types";

function NodeRow({
  node,
  mode,
  depth = 0,
}: {
  node: MaskedNode;
  mode: ItemMode;
  depth?: number;
}) {
  if (node.kind === "hidden") {
    return (
      <li
        className="rounded-md border border-dashed border-line bg-white/30 px-3 py-3 text-sm text-ink-soft"
        style={{ marginLeft: depth * 12 }}
      >
        Hidden until the decision is locked in
      </li>
    );
  }

  return (
    <li style={{ marginLeft: depth * 12 }}>
      <div className="rounded-md border border-line bg-white/55 px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-ink">{node.label}</span>
          <span className="shrink-0 text-sm tabular-nums text-ink-soft">
            {node.local_weight.toFixed(1)}%
            <span className="mx-1 text-line">·</span>
            {node.share_of_whole.toFixed(1)}% of whole
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ink-soft">
          {evidenceLabel(node.evidence_kind, mode)}
          {node.confirmed ? " · Confirmed" : ""}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.children.map((c) => (
            <NodeRow key={c.id} node={c} mode={mode} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FullPicture({
  tree,
  mode,
}: {
  tree: MaskedNode[];
  mode: ItemMode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl text-ink">Full picture</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Other people’s sections stay hidden until lock-in. Aggregate stats above
        still describe the whole.
      </p>
      <ul className="mt-4 space-y-2">
        {tree.map((n) => (
          <NodeRow key={n.id} node={n} mode={mode} />
        ))}
      </ul>
    </section>
  );
}
