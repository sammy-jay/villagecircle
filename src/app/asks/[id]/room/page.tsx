import { redirect } from "next/navigation";
import { participantPage } from "@/lib/participant-ctx";
import { callView, joinCall, preJoinView } from "@/lib/connections";
import { Room } from "./room";

export const metadata = { title: "In the call" };
export const dynamic = "force-dynamic";

/** CL2 In the call. Joining is checked again here, so a stale link cannot open a paused or ended call. */
export default async function InCall({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/call` : r.to);
  const j = await joinCall(r.ctx.userId, params.id);
  if (!j.ok) redirect(`/asks/${params.id}/call`);
  const [v, p] = await Promise.all([callView(r.ctx.userId, params.id), preJoinView(r.ctx.userId, params.id)]);
  if (!v?.start) redirect(`/asks/${params.id}`);
  const src = j.simulated ? "" : `${j.url}?t=${encodeURIComponent(j.token)}`;
  return (
    <Room askId={params.id} src={src} simulated={j.simulated} title={`${v.topic} call with ${v.mentorShort}`} mentor={v.mentorShort} me={v.participantFirst}
      guardian={p?.guardianAttends ? p.guardianName : null} recorded={v.recorded} startIso={v.start.toISOString()} minutes={v.minutes} />
  );
}
