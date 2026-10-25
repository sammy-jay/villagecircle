import { NextResponse } from "next/server";
import { adminActor } from "@/lib/admin-ctx";
import { buildReport, reportCsv } from "@/lib/admin-reports";
import { audit } from "@/lib/audit";

/** A4 "Export CSV": counts only. Program lead and read-only roles; every export is logged. */
export async function GET(req: Request) {
  const a = await adminActor("reports.export");
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: 403 });
  const p = new URL(req.url).searchParams;
  const rep = await buildReport(Number(p.get("range")) || 90, p.get("cohort") ?? "");
  await audit(a.actor.id, "report.export", "Report", undefined, null, { range: rep.range, cohort: rep.cohort || "all" });
  return new NextResponse(reportCsv(rep), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="village-circle-report-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
