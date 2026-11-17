"use client";

import { useEffect, useState } from "react";
import type { ItemMode } from "@/lib/types";

type Status = { enabled: boolean; configured: boolean };

export function DraftWithAI({
  mode,
  title,
  onDraftSections,
}: {
  mode: ItemMode;
  title: string;
  /** Called with proposed section names when a draft is returned (live provider). */
  onDraftSections?: (sections: string[]) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/ai/status")
      .then((r) => r.json())
      .then((b) => setStatus({ enabled: !!b.enabled, configured: !!b.configured }))
      .catch(() => setStatus({ enabled: false, configured: false }));
  }, []);

  if (!status?.enabled) return null;

  async function runDraft() {
    setBusy(true);
    setMessage("");
    try {
      if (!status?.configured) {
        setMessage("AI drafting isn’t configured");
        return;
      }
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          title: title || "Untitled",
          source_material: notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(body.message ?? body.error ?? "AI drafting isn’t configured");
        return;
      }
      const labels = (body.sections ?? []).map(
        (s: { label: string }) => s.label as string,
      );
      onDraftSections?.(labels);
      setMessage(
        labels.length
          ? `Draft proposed ${labels.length} sections (un-confirmed). Review before creating.`
          : "AI drafting isn’t configured",
      );
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-line bg-white/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-sea hover:text-sea-deep"
      >
        Draft with AI
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {!status.configured ? (
            <p className="text-sm text-ink-soft">AI drafting isn’t configured</p>
          ) : (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Paste a brief, notes, or transcript…"
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-sea focus:ring-2"
              />
              <button
                type="button"
                disabled={busy || !notes.trim()}
                onClick={() => void runDraft()}
                className="rounded-md bg-sea px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Drafting…" : "Propose draft"}
              </button>
            </>
          )}
        </div>
      )}
      {message && (
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
