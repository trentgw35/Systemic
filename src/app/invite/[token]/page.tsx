"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "need-auth" | "error" | "ok">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus("need-auth");
        return;
      }

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!cancelled) {
          setStatus("error");
          setMessage(body.error ?? "Could not accept invite");
        }
        return;
      }
      if (!cancelled) {
        setStatus("ok");
        router.replace(`/w/${body.workspaceId}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Link href="/" className="font-display text-3xl text-ink">
        Systemic
      </Link>
      {status === "loading" && (
        <p className="mt-4 text-ink-soft">Accepting invite…</p>
      )}
      {status === "need-auth" && (
        <div className="mt-4 space-y-3">
          <p className="text-ink-soft">
            Sign in (or create an account with the invited email) to join this
            workspace.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            className="inline-block rounded-md bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
          >
            Sign in to accept
          </Link>
        </div>
      )}
      {status === "error" && (
        <p className="mt-4 text-danger">{message}</p>
      )}
      {status === "ok" && (
        <p className="mt-4 text-ok">Joined. Redirecting…</p>
      )}
    </main>
  );
}
