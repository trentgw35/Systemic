"use client";

import { useState } from "react";
import { DraftWithAI } from "@/components/ai/draft-with-ai";
import { evidenceLabel } from "@/lib/engine/kinds";
import type { ItemMode, EvidenceKind } from "@/lib/types";
import { CoupledSliders, type SliderChild } from "./coupled-sliders";

const KINDS: EvidenceKind[] = [
  "opinion",
  "anecdote",
  "advisory",
  "data",
  "process",
];

type Child = SliderChild & {
  owner_id: string | null;
  delegated_from: string | null;
  confirmed: boolean;
  delegated_to_name: string | null;
  waiting_on_name: string | null;
};

export function SectionEditor({
  itemId,
  parentId,
  sectionShare,
  inputs,
  mode,
  itemTitle,
  localLabel,
  wholeLabel,
  confirmed,
  members,
  onChanged,
}: {
  itemId: string;
  parentId: string;
  sectionShare: number;
  inputs: Child[];
  mode: ItemMode;
  itemTitle: string;
  localLabel: string;
  wholeLabel: string;
  confirmed: boolean;
  members: Array<{ id: string; name: string; email: string }>;
  onChanged: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [delegateFor, setDelegateFor] = useState<string | null>(null);
  const [delegateTo, setDelegateTo] = useState(members[0]?.id ?? "");

  async function structure(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/items/${itemId}/structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function delegate(nodeId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/items/${itemId}/nodes/${nodeId}/delegate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_user_id: delegateTo }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delegate failed");
      setDelegateFor(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delegate failed");
    } finally {
      setBusy(false);
    }
  }

  async function takeBack(nodeId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/items/${itemId}/nodes/${nodeId}/take-back`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Take-back failed");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Take-back failed");
    } finally {
      setBusy(false);
    }
  }

  const sliderInputs: SliderChild[] = inputs.map((c) => ({
    id: c.id,
    label: c.label,
    evidence_kind: c.evidence_kind,
    local_weight: c.local_weight,
    share_of_whole: c.share_of_whole,
    has_children: c.has_children,
  }));

  return (
    <div className="space-y-4">
      <CoupledSliders
        itemId={itemId}
        parentId={parentId}
        sectionShare={sectionShare}
        inputs={sliderInputs}
        mode={mode}
        localLabel={localLabel}
        wholeLabel={wholeLabel}
        confirmed={confirmed}
        onChanged={onChanged}
      />

      <div className="space-y-3 border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink">Structure</h3>
        <ul className="space-y-3">
          {inputs.map((child) => (
            <li
              key={child.id}
              className="rounded-md border border-line bg-white/50 p-3 text-sm"
            >
              <div className="font-medium text-ink">{child.label}</div>
              <div className="text-xs text-ink-soft">
                {evidenceLabel(child.evidence_kind, mode)}
              </div>
              {child.delegated_to_name && (
                <p className="mt-1 text-xs font-medium text-sea-deep">
                  Delegated to {child.delegated_to_name}
                  {child.waiting_on_name
                    ? ` · Waiting on ${child.waiting_on_name}`
                    : ""}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || Boolean(child.delegated_to_name)}
                  className="text-xs font-semibold text-sea disabled:opacity-40"
                  onClick={() => {
                    const label = window.prompt("Rename", child.label);
                    if (label?.trim()) {
                      void structure({
                        action: "rename",
                        node_id: child.id,
                        label: label.trim(),
                      });
                    }
                  }}
                >
                  Rename
                </button>
                <select
                  disabled={busy || Boolean(child.delegated_to_name)}
                  className="rounded border border-line bg-white px-1 text-xs"
                  value={child.evidence_kind}
                  onChange={(e) =>
                    void structure({
                      action: "set_kind",
                      node_id: child.id,
                      kind: e.target.value,
                    })
                  }
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {evidenceLabel(k, mode)}
                    </option>
                  ))}
                </select>
                {!child.has_children && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-sea disabled:opacity-40"
                    onClick={() =>
                      void structure({
                        action: "break_down",
                        node_id: child.id,
                      })
                    }
                  >
                    Break down
                  </button>
                )}
                {!child.delegated_to_name && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-sea disabled:opacity-40"
                    onClick={() => {
                      setDelegateFor(child.id);
                      setDelegateTo(members[0]?.id ?? "");
                    }}
                  >
                    Delegate
                  </button>
                )}
                {child.delegated_from && child.delegated_to_name && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-sea disabled:opacity-40"
                    onClick={() => void takeBack(child.id)}
                  >
                    Take back
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy || Boolean(child.delegated_to_name)}
                  className="text-xs font-semibold text-danger disabled:opacity-40"
                  onClick={() => {
                    if (window.confirm(`Remove “${child.label}”?`)) {
                      void structure({
                        action: "remove_input",
                        node_id: child.id,
                      });
                    }
                  }}
                >
                  Remove
                </button>
              </div>
              {delegateFor === child.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={delegateTo}
                    onChange={(e) => setDelegateTo(e.target.value)}
                    className="rounded border border-line bg-white px-2 py-1 text-xs"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-sea"
                    onClick={() => void delegate(child.id)}
                  >
                    Confirm delegate
                  </button>
                  <button
                    type="button"
                    className="text-xs text-ink-soft"
                    onClick={() => setDelegateFor(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={busy}
          className="rounded-md border border-line bg-white/70 px-3 py-2 text-sm font-semibold text-ink hover:bg-white disabled:opacity-50"
          onClick={() =>
            void structure({
              action: "add_input",
              parent_id: parentId,
              label: "New input",
              kind: "opinion",
            })
          }
        >
          Add input
        </button>
        <DraftWithAI
          mode={mode}
          title={itemTitle}
          onDraftSections={(labels) => {
            // Insert each proposed label as an un-confirmed input
            void (async () => {
              for (const label of labels.slice(0, 8)) {
                await structure({
                  action: "add_input",
                  parent_id: parentId,
                  label,
                  kind: "opinion",
                });
              }
              onChanged();
            })();
          }}
        />
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
