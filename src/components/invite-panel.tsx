"use client";

import { FormEvent, useState } from "react";

type Invite = {
  id: string;
  email: string | null;
  token: string;
  role: string;
  accepted_at: string | null;
  created_at: string;
};

export function InvitePanel({
  workspaceId,
  initialInvites,
}: {
  workspaceId: string;
  initialInvites: Invite[];
}) {
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState(initialInvites);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function createInvite(body: { email?: string; linkOnly?: boolean }) {
    setPending(true);
    setError("");
    setLinkUrl("");
    const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setInvites((prev) => [data.invite, ...prev]);
    if (data.url) setLinkUrl(data.url);
    setEmail("");
  }

  async function onEmailInvite(e: FormEvent) {
    e.preventDefault();
    await createInvite({ email: email.trim() });
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl text-ink">Invites</h2>
      <p className="text-sm text-ink-soft">
        Invite by email or share a link. Accepting creates the account if needed
        and joins this workspace.
      </p>

      <form onSubmit={onEmailInvite} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="flex-1 rounded-md border border-line bg-white/70 px-3 py-2.5 text-sm outline-none ring-sea focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
        >
          Invite by email
        </button>
      </form>

      <button
        type="button"
        disabled={pending}
        onClick={() => createInvite({ linkOnly: true })}
        className="rounded-md border border-line bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white disabled:opacity-60"
      >
        Create shareable invite link
      </button>

      {linkUrl && (
        <p className="break-all rounded-md border border-line bg-white/80 p-3 text-sm text-ink">
          Invite link:{" "}
          <a className="underline" href={linkUrl}>
            {linkUrl}
          </a>
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-line rounded-md border border-line bg-white/50">
        {invites.length === 0 && (
          <li className="px-3 py-4 text-sm text-ink-soft">No invites yet.</li>
        )}
        {invites.map((inv) => (
          <li key={inv.id} className="px-3 py-3 text-sm">
            <div className="font-medium text-ink">
              {inv.email ?? "Shareable link"}
            </div>
            <div className="text-ink-soft">
              {inv.accepted_at ? "Accepted" : "Pending"} · {inv.role}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
