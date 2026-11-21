import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { preJoinView, trackerView } from "@/lib/connections";
import { APP_TZ, joinOpensAt } from "@/lib/domain/scheduling";
import { JoinButton, Preview, Questions } from "./prejoin";
import { CallHeadline } from "@/components/app/call-clock";

export const metadata = { title: "Before the call" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const clock = (d: Date) => f(d, { hour: "numeric", minute: "2-digit", hour12: true });

/** CL1 Before the call: preview, checks, questions, join. Opens 10 minutes before the start. */
export default async function BeforeCall({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/call` : r.to);
  const v = await preJoinView(r.ctx.userId, params.id);
  if (!v) redirect(`/asks/${params.id}`);
  if (v.state === "ENDED") redirect(`/asks/${params.id}/after`);
  const t = await trackerView(r.ctx.userId, params.id);
  const mentor = v.mentorCard?.shortName ?? "your mentor";
  // The countdown and the Join button tick in the browser from the server's time, so nothing waits for a refresh.
  const timing = { startISO: v.start.toISOString(), minutes: v.minutes, serverNow: Date.now() };
  const approved = !!t?.connection?.guardianTimeApprovedAt;
  const g = v.guardianName;
  const checks: [string, boolean][] = [["Camera works", true], ["Microphone works", true], ...(t?.minor ? [[`${g ?? "Your guardian"} approved the time`, approved] as [string, boolean]] : []), ["Quiet place found", false]];

  const aside = (
    <>
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Ready?</h2>
        <ul className="flex flex-col gap-2">{checks.map(([c, ok]) => <li key={c} className="flex items-center gap-2.5 text-[14.5px]"><span className={ok ? "flex size-[22px] items-center justify-center rounded-full bg-forest text-forest-ink" : "size-[22px] rounded-full border-2 border-dashed border-line"}>{ok && <Icon name="check" size={13} strokeWidth={3} />}</span>{c}</li>)}</ul>
      </Card>
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Your 2 questions</h2>
        <Questions askId={params.id} />
      </Card>
      <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink">
        <b>Staying safe.</b> Calls stay on the platform{v.recorded ? " and are recorded because you are under 18" : ""}.{v.guardianAttends && g ? ` ${g} can join or watch.` : ""} Never share your number or address.
      </section>
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false} phone={{ back: `/asks/${params.id}`, title: "Starting soon" }}>
      <div>
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.04em] text-clay lg:text-[13px]">{v.topic} call · {f(v.start, { weekday: "short", day: "numeric", month: "short" })}, {clock(v.start)}</p>
        <h1 className="mt-1.5 font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]" aria-live="polite"><CallHeadline clock={timing} later={`Your call is ${f(v.start, { weekday: "long" })} at ${clock(v.start)}`} /></h1>
        <p className="mt-1.5 text-[15.5px] text-bark">With {mentor} · {v.minutes} minutes{t?.minor && approved && g ? ` · ${g} said yes.` : ""}</p>
      </div>
      {v.paused && <p role="alert" className="rounded-[18px] bg-blush px-4 py-3 text-[15px] font-semibold text-blush-ink">This conversation is paused while the team looks at something. We will be in touch.</p>}
      <Preview />
      <section className="flex gap-3 rounded-[20px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink max-lg:hidden">
        <Icon name="wifiOff" size={22} className="shrink-0" /><p><b>Short on data?</b> Turn your camera off and keep your voice on. {mentor} will understand, and the call still counts.</p>
      </section>
      <div className="lg:hidden">{aside}</div>
      <div className="flex flex-wrap items-center gap-2.5 max-lg:hidden">
        <span className="text-[14px] font-bold">Add to calendar</span>
        {t?.calendarUrl && <a href={t.calendarUrl} target="_blank" rel="noreferrer" className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Google</a>}
        <a href={`/asks/${params.id}/ics`} className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Download .ics</a>
        <Link href={`/asks/${params.id}/reschedule`} className="ml-auto text-[14px] font-bold text-clay">Reschedule</Link>
      </div>
      <JoinButton askId={params.id} clock={timing} paused={v.paused} opensAt={clock(joinOpensAt(v.start))} />
    </ParticipantShell>
  );
}
