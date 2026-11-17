"use client";

import { useEffect, useMemo, useState } from "react";
import type { MaskedNode } from "@/lib/engine/mask";
import { evidenceLabel } from "@/lib/engine/kinds";
import type { ItemMode } from "@/lib/types";

type Visible = Extract<MaskedNode, { kind: "visible" }>;

function isNarrow() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(max-width: 640px)").matches;
}

function sortLargestFirst(nodes: MaskedNode[]): MaskedNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind === "hidden" && b.kind === "hidden") return 0;
    if (a.kind === "hidden") return 1;
    if (b.kind === "hidden") return -1;
    return b.share_of_whole - a.share_of_whole;
  });
}

function findVisible(
  nodes: MaskedNode[],
  id: string,
): { node: Visible; ancestors: Visible[] } | null {
  function walk(
    list: MaskedNode[],
    ancestors: Visible[],
  ): { node: Visible; ancestors: Visible[] } | null {
    for (const n of list) {
      if (n.kind === "hidden") continue;
      if (n.id === id) return { node: n, ancestors };
      const hit = walk(n.children, [...ancestors, n]);
      if (hit) return hit;
    }
    return null;
  }
  return walk(nodes, []);
}

function ShareBar({ share }: { share: number }) {
  return (
    <div className="mt-2 h-1 w-full overflow-hidden rounded bg-line/60">
      <div
        className="h-full bg-sea/70"
        style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
      />
    </div>
  );
}

function VisibleNode({
  node,
  mode,
  depth,
  collapsed,
  onToggle,
  onFocus,
  canFocus,
}: {
  node: Visible;
  mode: ItemMode;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  canFocus: boolean;
}) {
  const hasKids = node.children.length > 0;
  const isCollapsed = hasKids && collapsed.has(node.id);
  const kids = sortLargestFirst(node.children);

  return (
    <li>
      <div className="rounded-md border border-line bg-white/55 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {hasKids && (
                <button
                  type="button"
                  onClick={() => onToggle(node.id)}
                  className="text-xs font-medium text-sea"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? "Expand" : "Collapse"}
                </button>
              )}
              <span className="font-medium text-ink">{node.label}</span>
              <span className="rounded bg-sea/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-sea-deep">
                {node.share_of_whole.toFixed(1)}%
              </span>
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">
              {evidenceLabel(node.evidence_kind, mode)}
              {" · "}
              <span className="tabular-nums">
                Within set {node.local_weight.toFixed(1)}%
              </span>
              {node.confirmed ? " · Confirmed" : ""}
            </div>
            <ShareBar share={node.share_of_whole} />
          </div>
          {canFocus && hasKids && (
            <button
              type="button"
              onClick={() => onFocus(node.id)}
              className="shrink-0 text-xs font-semibold text-sea hover:text-sea-deep"
            >
              Focus
            </button>
          )}
        </div>
      </div>
      {hasKids && !isCollapsed && (
        <ul className="mt-2 space-y-2 border-l border-line/70 pl-3">
          {kids.map((c) =>
            c.kind === "hidden" ? (
              <HiddenRow key={c.id} />
            ) : (
              <VisibleNode
                key={c.id}
                node={c}
                mode={mode}
                depth={depth + 1}
                collapsed={collapsed}
                onToggle={onToggle}
                onFocus={onFocus}
                canFocus={canFocus}
              />
            ),
          )}
        </ul>
      )}
    </li>
  );
}

function HiddenRow() {
  return (
    <li className="rounded-md border border-dashed border-line bg-white/30 px-3 py-3 text-sm text-ink-soft">
      Hidden until the decision is locked in
    </li>
  );
}

export function FullPicture({
  tree,
  mode,
  locked,
}: {
  tree: MaskedNode[];
  mode: ItemMode;
  locked: boolean;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [narrow, setNarrow] = useState(true);

  useEffect(() => {
    const update = () => setNarrow(isNarrow());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Deeper levels start collapsed on narrow screens
  useEffect(() => {
    if (!narrow) {
      setCollapsed(new Set());
      return;
    }
    const deep = new Set<string>();
    function walk(nodes: MaskedNode[], depth: number) {
      for (const n of nodes) {
        if (n.kind === "hidden") continue;
        if (depth >= 1 && n.children.length) deep.add(n.id);
        walk(n.children, depth + 1);
      }
    }
    walk(tree, 0);
    setCollapsed(deep);
  }, [tree, narrow]);

  const focusHit = useMemo(
    () => (focusId ? findVisible(tree, focusId) : null),
    [tree, focusId],
  );

  // Pre-lock-in: cannot focus another member's hidden section (no id exposed as focusable)
  const roots = sortLargestFirst(
    focusHit ? focusHit.node.children : tree,
  );

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-ink">Full picture</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {locked
              ? "The locked record — full tree for every member."
              : "Other people’s sections stay hidden until lock-in."}
          </p>
        </div>
        {focusHit && (
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className="text-sm font-semibold text-sea hover:text-sea-deep"
          >
            Back to full picture
          </button>
        )}
      </div>

      {focusHit && (
        <nav
          className="mt-3 flex flex-wrap items-center gap-1 text-sm text-ink-soft"
          aria-label="Focus breadcrumb"
        >
          {focusHit.ancestors.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                className="font-medium text-sea"
                onClick={() => setFocusId(a.id)}
              >
                {a.label}
              </button>
              <span className="tabular-nums">
                ({a.share_of_whole.toFixed(1)}%)
              </span>
              <span aria-hidden>›</span>
            </span>
          ))}
          <span className="font-medium text-ink">
            {focusHit.node.label}{" "}
            <span className="tabular-nums text-ink-soft">
              ({focusHit.node.share_of_whole.toFixed(1)}%)
            </span>
          </span>
        </nav>
      )}

      <ul className="mt-4 space-y-2">
        {roots.map((n) =>
          n.kind === "hidden" ? (
            <HiddenRow key={n.id} />
          ) : (
            <VisibleNode
              key={n.id}
              node={n}
              mode={mode}
              depth={0}
              collapsed={collapsed}
              onToggle={toggle}
              onFocus={setFocusId}
              canFocus={n.kind === "visible"}
            />
          ),
        )}
      </ul>
    </section>
  );
}
