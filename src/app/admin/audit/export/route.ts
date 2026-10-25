import { NextResponse } from "next/server";
import { adminActor } from "@/lib/admin-ctx";
import { auditExport } from "@/lib/admin-data";

/** A15 "Export CSV". Safeguarding lead or program lead only; the export itself is written to the log. */
export async function GET(req: Request) {
  const a = await adminActor("audit");
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: 403 });
  const p = new URL(req.url).searchParams;
  const csv = await auditExport(a.actor, { actor: p.get("actor") || undefined, object: p.get("object") || undefined, from: p.get("from") || undefined, to: p.get("to") || undefined });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="village-circle-audit-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
