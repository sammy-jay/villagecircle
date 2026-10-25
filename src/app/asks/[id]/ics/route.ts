import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { trackerView } from "@/lib/connections";
import { buildIcs } from "@/lib/integrations/calendar";
import { appUrl } from "@/lib/notify";

/** D3 "Download .ics" for the participant's own booked conversation. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const t = await trackerView(id, params.id);
  if (!t?.connection?.scheduledAt) return NextResponse.json({ error: "Not booked." }, { status: 404 });
  const ics = buildIcs({ uid: t.connection.id, title: `Village Circle: ${t.topic}`, startsAt: t.connection.scheduledAt, minutes: t.connection.minutes, description: "Join from My Asks. The link opens 10 minutes before.", url: appUrl(`/asks/${params.id}`), organizerEmail: "" });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="village-circle-${params.id}.ics"` } });
}
