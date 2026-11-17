import { NextResponse } from "next/server";
import {
  isAIFeaturesEnabled,
  isAIProviderConfigured,
} from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    enabled: isAIFeaturesEnabled(),
    configured: isAIProviderConfigured(),
  });
}
