import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAIProvider,
  isAIFeaturesEnabled,
  isAIProviderConfigured,
} from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  check_title: z.string().trim().min(1),
  check_detail: z.string().trim().default(""),
  item_title: z.string().trim().min(1),
  mode: z.enum(["decision", "rcca"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAIFeaturesEnabled()) {
    return NextResponse.json({ error: "AI features are off" }, { status: 403 });
  }
  if (!isAIProviderConfigured()) {
    return NextResponse.json(
      { error: "not_configured", message: "AI drafting isn’t configured" },
      { status: 503 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const provider = getAIProvider();
  const text = await provider.interpret({
    checkTitle: parsed.data.check_title,
    checkDetail: parsed.data.check_detail,
    itemTitle: parsed.data.item_title,
    mode: parsed.data.mode,
  });

  if (!text) {
    return NextResponse.json(
      { error: "not_configured", message: "AI drafting isn’t configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ interpretation: text });
}
