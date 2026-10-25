import { NextResponse } from "next/server";
import { screening } from "@/lib/integrations/screening";
import { applyScreeningResult } from "@/lib/admin-applications";

export const dynamic = "force-dynamic";

/** Screening provider results (Checkr by default). The signature is checked first; CONSIDER never auto-declines, a person decides. */
export async function POST(req: Request) {
  const raw = await req.text();
  const r = screening().parseWebhook(raw, req.headers.get("x-checkr-signature"));
  if (!r) return NextResponse.json({ error: "Signature or body not accepted." }, { status: 401 });
  const found = await applyScreeningResult(r.ref, r.state);
  return NextResponse.json({ ok: true, matched: found });
}
