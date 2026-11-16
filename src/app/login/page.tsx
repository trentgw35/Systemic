"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onMagicLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the sign-in link.");
  }

  async function onGoogle() {
    setStatus("sending");
    setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(
        error.message ||
          "Google sign-in isn’t configured yet. Use the email link, or see the README.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="font-display text-3xl text-ink">
        Systemic
      </Link>
      <p className="mt-3 text-ink-soft">
        Sign in to your workspace. Contributors only ever build their own
        section.
      </p>

      <form onSubmit={onMagicLink} className="mt-8 space-y-4">
        <label className="block text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-white/70 px-3 py-2.5 text-ink outline-none ring-sea focus:ring-2"
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-md bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Email me a magic link"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={onGoogle}
        className="w-full rounded-md border border-line bg-white/60 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-white"
      >
        Continue with Google
      </button>
      <p className="mt-2 text-xs text-ink-soft">
        Google OAuth must be enabled in your Supabase project. Until then, use
        the email magic link.
      </p>

      {(message || authError) && (
        <p
          className={`mt-6 text-sm ${status === "error" || authError ? "text-danger" : "text-ok"}`}
          role="status"
        >
          {message || "Sign-in failed. Try again."}
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-8 text-ink-soft">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
