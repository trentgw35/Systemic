"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Member = { id: string; name: string; email: string };

export function CreateItemForm({
  workspaceId,
  members,
  currentUserId,
}: {
  workspaceId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"decision" | "rcca">("decision");
  const [title, setTitle] = useState("");
  const [groupTag, setGroupTag] = useState("");
  const [expectedAreas, setExpectedAreas] = useState("");
  const [sections, setSections] = useState([
    { name: "", owner_id: currentUserId },
    { name: "", owner_id: currentUserId },
  ]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateSection(
    index: number,
    patch: Partial<{ name: string; owner_id: string }>,
  ) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function addSection() {
    if (sections.length >= 6) return;
    setSections((prev) => [
      ...prev,
      { name: "", owner_id: currentUserId },
    ]);
  }

  function removeSection(index: number) {
    if (sections.length <= 2) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const areas = expectedAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/workspaces/${workspaceId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          group_tag: groupTag.trim() || null,
          mode,
          expected_areas: mode === "rcca" ? areas : null,
          sections: sections.map((s) => ({
            name: s.name.trim(),
            owner_id: s.owner_id,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Could not create item");
      }
      router.push(`/w/${workspaceId}/items/${body.id}`);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="flex flex-wrap gap-3">
        <legend className="sr-only">Mode</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            checked={mode === "decision"}
            onChange={() => setMode("decision")}
          />
          Decision
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            checked={mode === "rcca"}
            onChange={() => setMode("rcca")}
          />
          What went wrong (RCCA)
        </label>
      </fieldset>

      <label className="block text-sm font-medium text-ink">
        {mode === "rcca" ? "Problem statement" : "Decision title"}
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-white/70 px-3 py-2.5 outline-none ring-sea focus:ring-2"
          placeholder={
            mode === "rcca"
              ? "What went wrong, when, and what it cost?"
              : "What are we deciding?"
          }
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        Group tag (optional)
        <input
          value={groupTag}
          onChange={(e) => setGroupTag(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-white/70 px-3 py-2.5 outline-none ring-sea focus:ring-2"
          placeholder="e.g. Q1 planning"
        />
      </label>

      {mode === "rcca" && (
        <label className="block text-sm font-medium text-ink">
          Expected areas (optional, comma-separated)
          <input
            value={expectedAreas}
            onChange={(e) => setExpectedAreas(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-white/70 px-3 py-2.5 outline-none ring-sea focus:ring-2"
            placeholder="Supply, Planning, Quality"
          />
        </label>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">
          {mode === "rcca" ? "Cause areas (2–6)" : "Sections (2–6)"}
        </legend>
        <p className="text-sm text-ink-soft">
          Each starts with equal share and two starter inputs at 50/50.
        </p>
        {sections.map((section, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-md border border-line bg-white/50 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              required
              value={section.name}
              onChange={(e) => updateSection(index, { name: e.target.value })}
              className="rounded-md border border-line bg-white/70 px-3 py-2 outline-none ring-sea focus:ring-2"
              placeholder={
                mode === "rcca"
                  ? `Area ${index + 1}`
                  : `Section ${index + 1} name`
              }
            />
            <select
              value={section.owner_id}
              onChange={(e) =>
                updateSection(index, { owner_id: e.target.value })
              }
              className="rounded-md border border-line bg-white/70 px-3 py-2 outline-none ring-sea focus:ring-2"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeSection(index)}
              disabled={sections.length <= 2}
              className="text-sm text-ink-soft disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSection}
          disabled={sections.length >= 6}
          className="text-sm font-semibold text-sea hover:text-sea-deep disabled:opacity-40"
        >
          Add {mode === "rcca" ? "area" : "section"}
        </button>
      </fieldset>

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-sea-deep disabled:opacity-60"
      >
        {status === "saving"
          ? "Creating…"
          : mode === "rcca"
            ? "Create RCCA"
            : "Create decision"}
      </button>
      {message && (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
