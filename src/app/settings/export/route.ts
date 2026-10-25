import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exportFile } from "@/lib/safety-user";

/** EX14 / D21 download of the person's own export, JSON or CSV, while the request is valid (7 days). */
export async function GET(req: Request) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const f = await exportFile(id, format);
  if (!f) return NextResponse.json({ error: "Request a copy first." }, { status: 404 });
  return new NextResponse(f.body, { headers: { "Content-Type": `${f.type}; charset=utf-8`, "Content-Disposition": `attachment; filename="${f.name}"` } });
}
