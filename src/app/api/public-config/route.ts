import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Public Supabase URL + anon key for the browser client (anon is designed to be public). */
export async function GET() {
  try {
    return NextResponse.json({
      supabaseUrl: getSupabaseUrl(),
      supabaseAnonKey: getSupabaseAnonKey(),
    });
  } catch {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }
}
