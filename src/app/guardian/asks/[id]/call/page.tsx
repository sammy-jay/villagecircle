import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { preJoinView } from "@/lib/connections";
import { guardianApprovalView } from "@/lib/call-extra";
import { APP_TZ, joinOpensAt } from "@/lib/domain/scheduling";
import { GuardianJoin } from "./join";
import { OpensLine } from "@/components/app/call-clock";

export const metadata = { title: "Before you join" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const clock = (d: Date) => f(d, { hour: "numeric", minute: "2-digit", hour12: true });

/** P07 Before you join: the guardian joins as an observer, camera off. */
export default async function GuardianBeforeCall({ params }: { params: { id: string } }) {
  const r = await guardianPage(`/guardian/asks/${params.id}/call`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const [v, a] = await Promise.all([preJoinView(c.userId, params.id), guardianApprovalView(c.userId, params.id)]);
  if (!v || v.role !== "GUARDIAN") redirect("/guardian");
  const mentor = v.mentorCard?.shortName ?? "the mentor";
  const first = a?.participantFirst ?? "your young person";
  const opens = joinOpensAt(v.start);
  // The badge and the Join button tick in the browser from the server's time, so nothing waits for a refresh.
  const timing = { startISO: v.start.toISOString(), minutes: v.minutes, serverNow: Date.now() };
  const approvedOn = a?.connection?.guardianTimeApprovedAt;
  const good: [string, string][] = [["Your camera is off.", ""], ["You can step out", "and stay reachable. The conversation carries on."], ["You can pause the connection.", "That ends the call and alerts the safeguarding lead."], ["Join only from your dashboard.", "Never by a link sent privately."]];
  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} tabs={false} phone={{ back: "/guardian", title: "Before you join" }}
      aside={<>
        <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Good to know</h2><ul className="mt-2.5 flex flex-col gap-2.5 text-[14px] leading-normal">{good.map(([b, t]) => <li key={b}><b>{b}</b> {t}</li>)}</ul></Card>
        {v.recorded && <section className="rounded-card bg-butter p-5 text-butter-ink"><h2 className="font-display text-[18px] font-extrabold">Recorded for safety</h2><p className="mt-1.5 text-[13.5px] leading-normal">This conversation is recorded. Everyone is told before it starts. You can ask for the recording at any time.</p></section>}
      </>}>
      <Link href="/guardian" className="dc-btn dc-btn-soft h-10 self-start px-4 text-[14.5px] max-lg:hidden"><Icon name="chevronLeft" size={18} />Back</Link>
      <div>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Before you join</h1>
        <p className="mt-1.5 text-[15.5px] text-bark">{f(v.start, { weekday: "short", day: "numeric", month: "long" })}, {clock(v.start)} · {v.minutes} minutes with {mentor}</p>
        {v.recorded && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blush px-[13px] py-[7px] text-[12.5px] font-semibold text-blush-ink"><span className="size-2 rounded-full bg-current" />Recorded</span>}
      </div>
      {v.paused && <p role="alert" className="rounded-[18px] bg-blush px-4 py-3 text-[15px] font-semibold text-blush-ink">This conversation is paused. A team member will be in touch.</p>}
      <section className="flex flex-col gap-2 rounded-[28px] bg-mint p-6 text-mint-ink">
        <h2 className="font-display text-[22px] font-extrabold leading-[1.12]">You join as an observer</h2>
        <p className="text-[15px] leading-normal">Your camera is off. {first} and {mentor.split(" ")[0]} can see you are here. You can step out and stay reachable, or pause the connection.</p>
      </section>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">The link opens 10 minutes before the start</h2><span className="text-[13.5px] font-bold text-clay" aria-live="polite"><OpensLine clock={timing} /></span></div>
        <p className="text-[14px] text-bark">{f(opens, { weekday: "short", day: "numeric", month: "short" })}, {clock(opens)}</p>
        <GuardianJoin askId={params.id} clock={timing} paused={v.paused} opensAt={clock(opens)} />
        <p className="text-[12.5px] text-stone">Opens in the approved video service.</p>
      </Card>
      <Card className="flex items-center gap-3.5 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{mentor.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div className="min-w-0"><p className="text-[16px] font-bold">{mentor}</p><p className="text-[13px] text-stone">{[v.mentorCard?.headline, "Reviewed by the team"].filter(Boolean).join(" · ")}</p>{approvedOn && <p className="text-[13px] text-bark">You approved this mentor and this time on {f(approvedOn, { day: "numeric", month: "short" })}.</p>}</div>
      </Card>
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Need to change it?</h2>
        <p className="text-[14px] text-bark">If this time no longer works, the team will help you find another.</p>
        <Link href="/settings/contact" className="dc-btn dc-btn-ghost h-11 self-start">I cannot make it now</Link>
      </Card>
    </GuardianShell>
  );
}
