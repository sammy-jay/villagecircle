import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Daily webhooks. "recording.ready-to-download" stores the recording's storage key on the connection, so the guardian (G3)
 * and the safeguarding lead can request it. Signed with DAILY_WEBHOOK_SECRET: base64 HMAC-SHA256 of "<timestamp>.<body>".
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  const ts = req.headers.get("x-webhook-timestamp"); const sig = req.headers.get("x-webhook-signature");
  if (!secret || !ts || !sig) return NextResponse.json({ error: "Not signed." }, { status: 401 });
  const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(`${ts}.${raw}`).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  let body: { type?: string; payload?: { room_name?: string; s3_key?: string; recording_id?: string } };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad body." }, { status: 400 }); }
  if (body.type !== "recording.ready-to-download") return NextResponse.json({ ok: true, ignored: body.type ?? "unknown" });
  const room = body.payload?.room_name ?? ""; const key = body.payload?.s3_key ?? body.payload?.recording_id ?? "";
  if (!room || !key) return NextResponse.json({ error: "Missing room or recording." }, { status: 400 });
  const byName = await db.connection.findFirst({ where: { roomName: room } });
  const id = byName?.id ?? (/^vc-([0-9a-f]{24})$/i.exec(room)?.[1] ?? null);
  if (!id) return NextResponse.json({ ok: true, matched: false });
  const r = await db.connection.updateMany({ where: { id }, data: { recordingKey: key } });
  if (r.count) await audit(null, "recording.stored", "Connection", id, null, { key });
  return NextResponse.json({ ok: true, matched: r.count > 0 });
}
