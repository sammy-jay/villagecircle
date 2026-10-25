import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card, Pill } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorInbox } from "@/lib/mentor-asks";
import { mentorConversations } from "@/lib/mentor-extra";
import { mentorHours } from "@/lib/insight";
import { relativeTime } from "@/lib/domain/insight";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";
import { passAction } from "./actions";
import { InboxFilters } from "./inbox-filters";
import { HoursAside, ageLabel } from "./mentor-kit";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

type Tab = "open" | "stepped" | "scheduled" | "completed";
const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
const greet = () => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", hourCycle: "h23" }).format(new Date())); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const DONE: Record<string, string> = { passed: "Passed. Nobody is told, and it never affects your standing.", returned: "Returned to the team with your note. Thank you.", handed: "Handed back. The team finds another mentor, and the family is told kindly.", moved: "New times sent. The family picks one, and a guardian approves it if needed." };
const NUM = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/** D5 Inbox: Asks the team released to this mentor, and their own conversations by stage. */
export default async function MentorInbox({ searchParams }: { searchParams: { tab?: string; topic?: string; age?: string; len?: string; sort?: string; done?: string } }) {
  const r = await mentorPage("/mentor");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const [inbox, convs, hours] = await Promise.all([mentorInbox(c.userId), mentorConversations(c.userId), mentorHours(c.userId)]);
  if (!inbox || !convs || !hours) redirect("/mentor/application");
  const tab: Tab = (["open", "stepped", "scheduled", "completed"] as const).find((t) => t === searchParams.tab) ?? "open";
  let items = inbox.items;
  if (searchParams.topic) items = items.filter((i) => i.topic === searchParams.topic);
  if (searchParams.age === "minor") items = items.filter((i) => i.ageBand !== "18+");
  if (searchParams.age === "adult") items = items.filter((i) => i.ageBand === "18+");
  if (searchParams.len === "30" || searchParams.len === "60") items = items.filter((i) => String(i.sessionLength) === searchParams.len);
  if (searchParams.sort === "old") items = [...items].reverse();
  const counts: [Tab, string, number][] = [["open", "Open", inbox.counts.open], ["stepped", "Stepped forward", convs.stepped.length], ["scheduled", "Scheduled", convs.scheduled.length], ["completed", "Completed", convs.completed.length]];
  const n = inbox.counts.open;
  const now = new Date();

  return (
    <MentorShell ctx={c} aside={<HoursAside hoursYear={hours.hoursYear} given={hours.given} monthly={hours.monthlyHours} />}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only lg:text-[40px]">Inbox</h1>
      {searchParams.done && DONE[searchParams.done] && <p role="status" className="flex items-center gap-2.5 rounded-[18px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />{DONE[searchParams.done]}</p>}
      {c.paused && <Link href="/mentor/reaffirm" className="flex items-center gap-3 rounded-[18px] bg-blush px-4 py-3.5 text-[14.5px] text-blush-ink"><Icon name="pause" size={20} className="shrink-0" /><span className="flex-1"><b>Your mentoring is paused.</b> New Asks will not reach you. Open conversations are kept.</span><Icon name="chevronRight" size={18} /></Link>}
      {hours.paused && <Link href="/mentor/availability" className="flex items-center gap-3 rounded-[18px] bg-sand px-4 py-3.5 text-[14.5px]"><Icon name="pause" size={20} className="shrink-0" /><span className="flex-1">Routing is paused, so no new Asks reach you. Turn it back on in Hours.</span><Icon name="chevronRight" size={18} /></Link>}
      {hours.atCap && !hours.paused && <Link href="/mentor/availability" className="flex items-center gap-3 rounded-[18px] bg-butter px-4 py-3.5 text-[14.5px] text-butter-ink"><Icon name="heart" size={20} className="shrink-0" /><span className="flex-1">You have given your hours for {hours.month}. Thank you. New Asks open again on {hours.nextMonth}.</span><Icon name="chevronRight" size={18} /></Link>}
      <section className="rounded-[28px] bg-mint px-6 py-6 text-mint-ink lg:px-8 lg:py-7">
        <h2 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[36px]">{greet()}, {c.first}</h2>
        <p className="mt-2 text-[15.5px] leading-normal lg:text-[16.5px]">{n ? `${NUM[n] ?? n} Ask${n === 1 ? "" : "s"} from the team match${n === 1 ? "es" : ""} your background. Step forward only where it feels right.` : "No Asks are waiting for you right now. The team sends one when it fits your background."}</p>
      </section>
      <nav aria-label="Inbox sections" className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        {counts.map(([t, l, k]) => <Link key={t} href={t === "open" ? "/mentor" : `/mentor?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-bold", tab === t ? "bg-forest text-forest-ink" : "bg-sand")}>{l} {k}</Link>)}
      </nav>

      {tab === "open" && (
        <>
          <InboxFilters topics={[...new Set(inbox.items.map((i) => i.topic))]} />
          {items.length ? items.map((a, i) => (
            <Card key={a.askId} className="flex flex-col gap-3 p-5 lg:px-[22px]">
              <div className="flex items-start gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold", ["bg-blush text-blush-ink", "bg-mint text-mint-ink", "bg-butter text-butter-ink"][i % 3])} aria-hidden="true">{a.topic[0]}</span>
                <div className="min-w-0 flex-1"><p className="text-[15px]"><b>{a.ageBand === "18+" ? "A participant" : "A young person"}</b><span className="text-stone"> · {ageLabel(a.ageBand)}</span></p><p className="text-[12.5px] text-stone">New from the team, read and cleared</p></div>
                <Pill icon="clock" className="bg-sand">{a.sessionLength} min</Pill>
              </div>
              <h3 className="font-display text-[20px] font-extrabold leading-[1.2] lg:text-[22px]">{a.question}</h3>
              <p className="text-[14.5px] leading-normal text-bark">{a.whatWouldHelp}</p>
              <div className="flex flex-wrap gap-2"><Pill className="bg-mint text-mint-ink">{a.topic}</Pill>{a.ageBand !== "18+" && <Pill icon="shieldCheck" className="bg-butter text-butter-ink">Guardian approves</Pill>}</div>
              {a.releasedAt && <p className="text-[12.5px] text-stone">Released {relativeTime(a.releasedAt, now).toLowerCase()}</p>}
              <div className="flex items-center gap-2">
                <Link href={`/mentor/asks/${a.askId}`} className="dc-btn dc-btn-forest h-[46px] px-6"><Icon name="arrowRight" size={18} />View summary</Link>
                <form action={passAction}><input type="hidden" name="askId" value={a.askId} /><button type="submit" className="h-[46px] px-4 text-[14.5px] font-bold text-bark hover:text-ink">Pass</button></form>
              </div>
            </Card>
          )) : <Card className="p-6 text-center"><p className="font-display text-[20px] font-extrabold">{inbox.items.length ? "Nothing matches these filters" : "Nothing waiting for you"}</p><p className="mt-1 text-[14.5px] text-bark">{inbox.items.length ? "Clear a filter to see every Ask." : "When the team finds an Ask that fits you, it appears here and we email you."}</p></Card>}
          <p className="px-2 text-center text-[13px] leading-normal text-bark"><span className="max-lg:hidden">Passing is never shown to the participant and never affects your standing. You are a guest at the village table, not an employee.</span><span className="lg:hidden">Passing is private and never affects your standing.</span></p>
        </>
      )}

      {tab === "stepped" && (convs.stepped.length ? convs.stepped.map((s) => (
        <Card key={s.askId} className="flex items-center gap-3.5 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-butter text-butter-ink"><Icon name="clock" size={20} /></span>
          <div className="min-w-0 flex-1"><p className="text-[16px] font-extrabold">{s.topic}</p><p className="text-[13.5px] text-stone">{s.minutes} minutes · {s.offered.length} time{s.offered.length === 1 ? "" : "s"} offered · waiting for the team</p></div>
        </Card>
      )) : <Empty>When you step forward on an Ask, it waits here while the team confirms who takes it.</Empty>)}

      {tab === "scheduled" && (convs.scheduled.length ? convs.scheduled.map((s) => (
        <Link key={s.askId} href={`/mentor/conversations/${s.askId}`} className="flex items-center gap-3.5 rounded-card border border-line bg-card p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-mint text-mint-ink"><Icon name="video" size={20} /></span>
          <div className="min-w-0 flex-1"><p className="text-[16px] font-extrabold">{s.topic} with {s.first}</p><p className="text-[13.5px] text-stone">{s.at ? when(s.at) : "Waiting for a time to be chosen"} · {s.minutes} minutes</p></div>
          <Icon name="chevronRight" size={18} className="text-stone" />
        </Link>
      )) : <Empty>Booked conversations appear here, with a link to join ten minutes before the start.</Empty>)}

      {tab === "completed" && (convs.completed.length ? convs.completed.map((s) => (
        <Link key={s.askId} href={`/mentor/conversations/${s.askId}`} className="flex items-center gap-3.5 rounded-card border border-line bg-card p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-sand"><Icon name="check" size={20} /></span>
          <div className="min-w-0 flex-1"><p className="text-[16px] font-extrabold">{s.topic} with {s.first}</p><p className="text-[13.5px] text-stone">{s.at ? when(s.at) : ""} · {s.minutes} minutes</p></div>
          <Icon name="chevronRight" size={18} className="text-stone" />
        </Link>
      )) : <Empty>Conversations you have finished appear here, with your notes.</Empty>)}
    </MentorShell>
  );
}

const Empty = ({ children }: { children: string }) => <Card className="p-6 text-center text-[15px] text-bark">{children}</Card>;
