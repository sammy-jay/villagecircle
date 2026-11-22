import { redirect } from "next/navigation";
import { mentorPage } from "@/lib/mentor-ctx";
import { callView, joinCall } from "@/lib/connections";
import { Room } from "@/app/asks/[id]/room/room";
import { mentorLeaveAction } from "../../../actions";

export const metadata = { title: "In the call" };
export const dynamic = "force-dynamic";

/** In the call, mentor view. Joining is checked again so a stale link cannot open a paused or ended call. Leaving goes to D8. */
export default async function MentorRoom({ params }: { params: { askId: string } }) {
  const r = await mentorPage(`/mentor/conversations/${params.askId}`);
  if ("to" in r) redirect(r.to);
  const j = await joinCall(r.ctx.userId, params.askId);
  if (!j.ok || j.role !== "MENTOR") redirect(`/mentor/conversations/${params.askId}`);
  const v = await callView(r.ctx.userId, params.askId);
  if (!v?.start) redirect("/mentor");
  return (
    <Room askId={params.askId} url={j.url} token={j.token} simulated={j.simulated} title={`${v.topic} with ${v.participantFirst}`} other={v.participantFirst} role="MENTOR"
      recorded={v.recorded} startIso={v.start.toISOString()} minutes={v.minutes} leave={mentorLeaveAction} trouble="/help"
      safety={`${v.recorded ? "This call is recorded because the participant is under 18. " : ""}Keep everything on the platform. If anything feels wrong, report it: one press pauses the connection and alerts our safeguarding lead.`} />
  );
}
