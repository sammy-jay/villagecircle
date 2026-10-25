import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { roleIn } from "@/lib/connections";
import { buildIcs } from "@/lib/integrations/calendar";
import { appUrl } from "@/lib/notify";

/** G1 "Download .ics" for a booked conversation of a linked young person. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const r = await roleIn(id, params.id);
  if (!r || r.role !== "GUARDIAN" || !r.conn?.scheduledAt) return NextResponse.json({ error: "Not booked." }, { status: 404 });
  const ics = buildIcs({ uid: r.conn.id, title: `${r.ask.participant.user.name.split(" ")[0]}'s conversation: ${r.ask.topic.name}`, startsAt: r.conn.scheduledAt, minutes: r.conn.durationMinutes, description: "Join from your guardian overview. The link opens 10 minutes before.", url: appUrl(`/guardian/asks/${params.id}/call`), organizerEmail: "" });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="village-circle-${params.id}.ics"` } });
}
