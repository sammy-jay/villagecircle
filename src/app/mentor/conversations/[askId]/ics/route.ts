import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { preJoinView } from "@/lib/connections";
import { buildIcs } from "@/lib/integrations/calendar";
import { appUrl } from "@/lib/notify";

/** CL4 "Download .ics" for the mentor's own booked conversation. No participant details beyond the topic. */
export async function GET(_: Request, { params }: { params: { askId: string } }) {
  const id = (await getSession())?.user?.id;
  if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const v = await preJoinView(id, params.askId);
  if (!v || v.role !== "MENTOR") return NextResponse.json({ error: "Not booked." }, { status: 404 });
  const ics = buildIcs({ uid: `${params.askId}-mentor`, title: `Village Circle: ${v.topic}`, startsAt: v.start, minutes: v.minutes, description: "Join from your mentor inbox. The link opens 10 minutes before.", url: appUrl(`/mentor/conversations/${params.askId}`), organizerEmail: "" });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="village-circle-${params.askId}.ics"` } });
}
