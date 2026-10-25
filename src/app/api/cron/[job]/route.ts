import { NextResponse } from "next/server";
import { cronAllowed } from "@/lib/domain/jobs";
import { callReminders, runDaily, runMonthly, runSweeps, serviceWindowSweep } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const JOBS: Record<string, () => Promise<unknown>> = {
  "service-windows": () => serviceWindowSweep(),
  reminders: () => callReminders(),
  sweeps: () => runSweeps(),
  daily: () => runDaily(),
  monthly: () => runMonthly(),
};

/** Vercel Cron (vercel.json) calls these with `Authorization: Bearer $CRON_SECRET`. Each job is safe to run twice. */
export async function GET(req: Request, { params }: { params: { job: string } }) {
  if (!cronAllowed(req.headers.get("authorization"), process.env.CRON_SECRET, process.env.NODE_ENV === "production")) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const run = JOBS[params.job]; if (!run) return NextResponse.json({ error: "Unknown job." }, { status: 404 });
  const started = Date.now();
  try { const result = await run(); return NextResponse.json({ ok: true, job: params.job, ms: Date.now() - started, result }); }
  catch (e) { console.error(`[cron:${params.job}]`, e); return NextResponse.json({ ok: false, job: params.job, error: "The job failed. See the server log." }, { status: 500 }); }
}
