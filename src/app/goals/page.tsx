import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, pastelAt } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { goalsAndNotes, dueCheckIn } from "@/lib/insight";
import { upcomingEvents } from "@/lib/village";
import { deleteGoalAction, stepAction } from "@/app/self-actions";
import { cn } from "@/lib/cn";
import { AddGoal, ProgressPills } from "./goal-forms";

export const metadata = { title: "My goals" };
export const dynamic = "force-dynamic";

const Ring = ({ pct, size = 64 }: { pct: number; size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(rgb(var(--forest)) 0 ${pct}%, rgb(var(--sand)) ${pct}% 100%)` }}>
    <span className="flex items-center justify-center rounded-full bg-card font-display text-[15px] font-extrabold" style={{ width: size - 16, height: size - 16 }}>{pct}%</span>
  </span>
);

/** D17 / P06 My goals: goals with progress, notes and next steps from calls, saved resources. Only you and your guardian see it. */
export default async function Goals() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/goals" : r.to);
  const [g, checkIn, events] = await Promise.all([goalsAndNotes(r.ctx.userId), dueCheckIn(r.ctx.userId), upcomingEvents(r.ctx.userId, 3)]);
  if (!g) redirect("/login");
  const nextStep = g.notes.flatMap((n) => n.steps.map((s, i) => ({ ...s, i, askId: n.askId }))).find((s) => !s.done);

  const aside = (
    <>
      {nextStep && (
        <Card className="flex flex-col gap-2.5 p-[18px]">
          <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Next up</h2>
          <p className="text-[14.5px] text-bark">{nextStep.text}</p>
          <form action={stepAction}><input type="hidden" name="askId" value={nextStep.askId} /><input type="hidden" name="index" value={nextStep.i} /><input type="hidden" name="done" value="1" /><button type="submit" className="dc-btn dc-btn-forest h-11"><Icon name="check" size={18} />Mark done</button></form>
        </Card>
      )}
      {checkIn && (
        <section className="flex flex-col gap-2.5 rounded-card bg-butter p-[18px] text-butter-ink">
          <h2 className="font-display text-[18px] font-extrabold">Your monthly check-in</h2>
          <p className="text-[13.5px]">A month ago you spoke with {checkIn.mentorFirst}. Two minutes, with the team.</p>
          <Link href="/goals/check-in" className="dc-btn dc-btn-soft h-11 bg-card">Open check-in</Link>
        </section>
      )}
      {events.length > 0 && (
        <Card className="p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Coming up</h2>
          <ul className="mt-2.5 flex flex-col gap-2.5">{events.map((e) => <li key={e.id} className="text-[14px]"><span className="block text-[12px] font-extrabold tracking-[.05em] text-stone">{e.month} {e.day}</span><Link href={`/village/events/${e.id}`} className="font-bold">{e.title}</Link></li>)}</ul>
        </Card>
      )}
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ back: "/me", title: "My goals" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">My goals</h1><p className="mt-1 text-[16px] text-bark">Small steps, one at a time. Only you{r.ctx.minor ? " and your guardian" : ""} can see this page.</p></div>
      <h1 className="sr-only lg:hidden">My goals</h1>
      {g.goals.length > 0 ? (
        <div className="flex flex-col gap-3">
          {g.goals.map((x, i) => (
            <section key={x.id} className={cn("flex flex-col gap-3 rounded-card p-4 lg:p-5", PASTEL[pastelAt(i)].both)}>
              <div className="flex items-center gap-3.5">
                <Ring pct={x.pct} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[19px] font-extrabold leading-[1.15]">{x.statement}</p>
                  <p className="mt-0.5 text-[13px] opacity-85">{x.label}{x.target ? ` · target ${x.target}` : " · no target date"}{x.linked ? ` · ${x.linked} linked ${x.linked === 1 ? "Ask" : "Asks"}` : ""}</p>
                </div>
                <form action={deleteGoalAction}><input type="hidden" name="id" value={x.id} /><button type="submit" aria-label={`Remove goal: ${x.statement}`} className="flex size-9 items-center justify-center rounded-full bg-card/70"><Icon name="trash" size={16} /></button></form>
              </div>
              <ProgressPills id={x.id} value={x.progress} />
            </section>
          ))}
        </div>
      ) : <Card className="p-5 text-[15px] text-bark">No goals yet. Add one below, or let your next call suggest one.</Card>}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Notes from your calls</h2>
        {g.notes.length ? g.notes.map((n) => (
          <Card key={n.askId} className="flex flex-col gap-3 p-5">
            <div><p className="font-display text-[18px] font-extrabold leading-[1.15]">{n.title}</p><p className="text-[13px] text-stone">{n.when}</p></div>
            {n.notes && <p className="whitespace-pre-line text-[14.5px] leading-normal text-bark">{n.notes}</p>}
            {n.steps.length > 0 && (
              <div>
                <p className="text-[12px] font-extrabold tracking-[.05em] text-stone">NEXT STEPS</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {n.steps.map((s, i) => (
                    <li key={i}>
                      <form action={stepAction} className="flex items-start gap-3">
                        <input type="hidden" name="askId" value={n.askId} /><input type="hidden" name="index" value={i} /><input type="hidden" name="done" value={s.done ? "0" : "1"} />
                        <button type="submit" aria-pressed={s.done} aria-label={s.done ? `Mark not done: ${s.text}` : `Mark done: ${s.text}`} className={cn("mt-px flex size-[26px] shrink-0 items-center justify-center rounded-check border-2", s.done ? "border-forest bg-forest text-forest-ink" : "border-line bg-card")}>{s.done && <Icon name="check" size={15} strokeWidth={3} />}</button>
                        <span className={cn("text-[15px] leading-[1.45]", s.done && "text-stone line-through")}>{s.text}</span>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`/asks/${n.askId}`} className="text-[13.5px] font-bold text-clay">Open this Ask</Link>
          </Card>
        )) : <Card className="p-5"><p className="font-bold">Notes from your conversations will appear here</p><p className="mt-1 text-[14px] text-bark">After each conversation your mentor can leave you a summary and next steps.</p></Card>}
      </section>

      <AddGoal />

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Saved resources</h2><Link href="/village/saved" className="text-[13.5px] font-bold text-clay">See all</Link></div>
        {g.saved.length ? g.saved.slice(0, 4).map((s) => <Link key={s.id} href={`/village/library/${s.id}`} className="rounded-card border border-line bg-card p-4"><p className="text-[15px] font-bold">{s.title}</p><p className="text-[13px] text-stone">{s.meta}</p></Link>)
          : <Card className="p-5 text-[14.5px] text-bark">Resources you save appear here.</Card>}
      </section>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
