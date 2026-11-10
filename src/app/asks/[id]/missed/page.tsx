import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { missedView } from "@/lib/connections";
import { missedAction } from "@/app/asks/exception-actions";

export const metadata = { title: "The conversation did not happen" };
export const dynamic = "force-dynamic";

/** EX3 Missed conversation, in the version for whoever was not there. Nobody is blamed. */
export default async function Missed({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/missed` : r.to);
  const v = await missedView(r.ctx.userId, params.id);
  if (!v) redirect(`/asks/${params.id}`);
  const mentorAbsent = v.variant === "MENTOR";
  const choice = (value: string, label: string, primary: boolean) => (
    <form action={missedAction}><input type="hidden" name="askId" value={params.id} /><input type="hidden" name="choice" value={value} />
      <button type="submit" className={primary ? "dc-btn dc-btn-primary h-[52px] w-full lg:w-auto" : "text-[14.5px] font-bold text-clay underline"}>{primary && <Icon name="calendar" size={18} />}{label}</button></form>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: `/asks/${params.id}`, title: "Missed call" }}
      aside={<>
        <Card className="p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What the team does</h2>
          <ul className="mt-2.5 flex flex-col gap-2.5 text-[13.5px]">
            {[["Marks it missed", "Mentor hours are not counted"], ["Offers one reschedule", v.minor ? "Same approval steps with your guardian" : "Same steps as before"], ...(v.minor ? [["Tells your guardian", "Always, for anyone under 18"]] : []), ["A second miss goes to a person", "A team member steps in, kindly"]].map(([a, b]) => <li key={a}><b>{a}</b><p className="text-stone">{b}</p></li>)}
          </ul>
        </Card>
        <p className="text-[12.5px] text-stone">No one is blamed here. If a mentor misses, the team follows it up with them.</p>
      </>}>
      <section className="flex flex-col gap-3 rounded-[30px] bg-blush p-6 text-blush-ink lg:rounded-[32px] lg:p-8">
        <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[38px]">{mentorAbsent ? `We are sorry. ${v.mentorFirst} did not join.` : "You missed the conversation"}</h1>
        <p className="text-[15.5px] leading-normal">{mentorAbsent ? `It was not your fault. We have told the team${v.minor ? " and your guardian" : ""}, and you can reschedule once.` : `It happens. ${v.mentorFirst} was there and has been thanked for their time.${v.minor ? " We have told your guardian." : ""}`}</p>
      </section>
      <Card className="flex flex-col gap-3 p-5">
        <p className="text-[14.5px] text-bark">{mentorAbsent ? `You waited ${v.waitedMin} minutes. The room has closed and nothing was recorded of the empty call.` : "You can rebook once. If it happens again, the team will talk to you first."}</p>
        {v.hasNewTimes
          ? <Link href={`/asks/${params.id}/time`} className="dc-btn dc-btn-primary h-[52px] w-full lg:w-auto lg:self-start"><Icon name="calendar" size={18} />{v.mentorFirst} offered new times. Pick one</Link>
          : v.canRebook ? choice("rebook", mentorAbsent ? "Pick a new time" : `Rebook with ${v.mentorFirst}`, true) : <p className="text-[14.5px] font-semibold">A team member will be in touch about what happens next.</p>}
        {mentorAbsent && choice("other", "Prefer someone else? Ask the team to find a new mentor", false)}
      </Card>
    </ParticipantShell>
  );
}
