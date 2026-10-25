import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { dueCheckIn, goalsAndNotes, monthlyReview } from "@/lib/insight";
import { cn } from "@/lib/cn";
import { CheckInForm } from "./check-in-form";

export const metadata = { title: "Monthly check-in" };
export const dynamic = "force-dynamic";

/** D22 Your month: what you asked, learned and did, plus the 30-day check-in when one is due. */
export default async function CheckIn() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/goals/check-in" : r.to);
  const [m, due, g] = await Promise.all([monthlyReview(r.ctx.userId), dueCheckIn(r.ctx.userId), goalsAndNotes(r.ctx.userId)]);
  if (!m) redirect("/login");
  const goal = g?.goals.find((x) => x.progress === "IN_PROGRESS");
  const counts: [number, string, string][] = [[m.counts.asks, m.counts.asks === 1 ? "Ask made" : "Asks made", "butter"], [m.counts.held, m.counts.held === 1 ? "conversation held" : "conversations held", "mint"], [m.counts.saved, "resources saved", "blush"], [m.counts.goals, "goals moved forward", "butter"]];
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/goals", title: "Check-in" }}
      aside={<>
        <Card className="flex flex-col gap-2 p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Next month</h2><p className="text-[14px] text-bark">Pick a goal to work on, or ask a mentor something new.</p><Link href="/goals" className="dc-btn dc-btn-soft h-11">Open my goals</Link></Card>
        <section className="rounded-card bg-blush p-[18px] text-[13.5px] leading-normal text-blush-ink"><b>Need to talk to someone right now?</b> Real help is there at any hour. In danger? Call 112. <Link href="/crisis" className="font-bold underline">Get support</Link></section>
      </>}>
      <div>
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.04em] text-clay lg:text-[13px]">{m.month} check-in</p>
        <h1 className="mt-1.5 font-display text-[32px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Your {m.month}</h1>
        <p className="mt-1.5 text-[15.5px] text-bark">What you asked, learned and did this month. Only you and the team see this.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map(([n, l, tone]) => <div key={l} className={cn("rounded-card p-4", PASTEL[tone as "butter"].both)}><p className="font-display text-[36px] font-extrabold leading-none">{n}</p><p className="mt-1.5 text-[13.5px]">{l}</p></div>)}
      </div>
      <Card className="flex flex-col gap-2.5 p-5">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">What you learned</h2>
        <p className="text-[15px] leading-normal text-bark">{m.learned}</p>
        {goal && <div className="mt-1 flex items-center justify-between rounded-field bg-sand px-4 py-3"><span className="text-[14.5px] font-bold">{goal.statement}</span><span className="text-[13px] text-stone">{goal.pct}%</span></div>}
        <Link href="/goals" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-clay"><Icon name="arrowRight" size={16} />Open my notes</Link>
      </Card>
      {due ? <CheckInForm id={due.id} mentor={due.mentorFirst} /> : <Card className="p-5 text-[14.5px] text-bark">No check-in is due right now. We will ask a month after each conversation.</Card>}
    </ParticipantShell>
  );
}
