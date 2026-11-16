"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anon: string }> | null = null;

async function loadConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const inlineUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const inlineAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (inlineUrl && inlineAnon) {
        return { url: inlineUrl, anon: inlineAnon };
      }
      const res = await fetch("/api/public-config");
      if (!res.ok) {
        throw new Error("Supabase public config unavailable");
      }
      const body = (await res.json()) as {
        supabaseUrl: string;
        supabaseAnonKey: string;
      };
      return { url: body.supabaseUrl, anon: body.supabaseAnonKey };
    })();
  }
  return configPromise;
}

export function createClient() {
  if (browserClient) return browserClient;
  const inlineUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const inlineAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (inlineUrl && inlineAnon) {
    browserClient = createBrowserClient(inlineUrl, inlineAnon);
    return browserClient;
  }
  // Synchronous fallback for first paint; callers that need guaranteed
  // config should use createClientAsync in rare cases.
  throw new Error(
    "Call createClientAsync() when NEXT_PUBLIC_ Supabase env is not inlined",
  );
}

export async function createClientAsync() {
  if (browserClient) return browserClient;
  const { url, anon } = await loadConfig();
  browserClient = createBrowserClient(url, anon);
  return browserClient;
}
