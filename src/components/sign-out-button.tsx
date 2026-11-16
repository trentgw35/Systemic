"use client";

import { useRouter } from "next/navigation";
import { createClientAsync } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      onClick={async () => {
        const supabase = await createClientAsync();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
