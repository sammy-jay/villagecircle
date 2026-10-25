import { redirect } from "next/navigation";
import { mentorPage } from "@/lib/mentor-ctx";
import { callView, joinCall, preJoinView } from "@/lib/connections";
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
  const [v, p] = await Promise.all([callView(r.ctx.userId, params.askId), preJoinView(r.ctx.userId, params.askId)]);
  if (!v?.start) redirect("/mentor");
  const src = j.simulated ? "" : `${j.url}?t=${encodeURIComponent(j.token)}`;
  return (
    <Room askId={params.askId} src={src} simulated={j.simulated} title={`${v.topic} with ${v.participantFirst}`} mentor={v.participantFirst} me={v.mentorShort}
      guardian={p?.guardianAttends ? "A guardian" : null} recorded={v.recorded} startIso={v.start.toISOString()} minutes={v.minutes}
      leave={mentorLeaveAction} trouble="/help" safety={`${v.recorded ? "This call is recorded because the participant is under 18. " : ""}Keep everything on the platform. If anything feels wrong, report it: one press pauses the connection and alerts our safeguarding lead.`} />
  );
}
