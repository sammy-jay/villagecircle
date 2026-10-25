import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Uptime check: the app answers and the database responds. Stays up in maintenance mode. */
export async function GET() {
  try { await db.$runCommandRaw({ ping: 1 }); return NextResponse.json({ ok: true, db: "up" }); }
  catch { return NextResponse.json({ ok: false, db: "down" }, { status: 503 }); }
}
