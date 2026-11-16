import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl tracking-tight text-ink sm:text-3xl">
          Systemic
        </p>
        <Link
          href="/login"
          className="rounded-md bg-sea px-4 py-2 text-sm font-medium text-white transition hover:bg-sea-deep"
        >
          Sign in
        </Link>
      </header>

      <section className="max-w-2xl py-16 sm:py-24">
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
          Systemic
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
          Make the decision together. Map what’s underneath it, so nothing
          important stays hidden — and remember why you made the call.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-sea-deep"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="text-sm text-ink-soft">
        Decisions and root-cause records, built together.
      </footer>
    </main>
  );
}
