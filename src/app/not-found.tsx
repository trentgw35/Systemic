import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <p className="font-display text-3xl text-ink">Systemic</p>
      <h1 className="mt-4 text-xl font-semibold text-ink">Not found</h1>
      <p className="mt-2 text-ink-soft">
        That page doesn’t exist, or you don’t have access to it.
      </p>
      <Link href="/app" className="mt-6 text-sea hover:text-sea-deep">
        Back to library
      </Link>
    </main>
  );
}
