import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, DateTile } from "@/components/app/feed";
import { GoingButton } from "@/components/app/feed-actions";
import { participantPage } from "@/lib/participant-ctx";
import { upcomingEvents } from "@/lib/village";
import { db } from "@/lib/db";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

const TABS = [["upcoming", "Upcoming"], ["mine", "My RSVPs"], ["past", "Past"]] as const;

/** N02 Events: upcoming, my RSVPs and past, filtered by type. Times are shown in the app's time zone. */
export default async function Events({ searchParams }: { searchParams: { tab?: string; type?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/village/events" : r.to);
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab! : "upcoming";
  const all = await upcomingEvents(r.ctx.userId, 40);
  const types = [...new Set(all.map((e) => e.title.split(": ")[0]!).filter((t, _, a) => a.length > 0 && t))].slice(0, 6);
  const typed = all.filter((e) => !searchParams.type || e.title.startsWith(`${searchParams.type}: `));
  const list = tab === "mine" ? typed.filter((e) => e.registered) : typed;
  const past = tab === "past" ? await db.event.findMany({ where: { startsAt: { lt: new Date() } }, orderBy: { startsAt: "desc" }, take: 10 }) : [];
  const mine = all.filter((e) => e.registered).length;
  const href = (p: Record<string, string | undefined>) => { const u = new URLSearchParams(); const v = { tab: tab === "upcoming" ? undefined : tab, type: searchParams.type, ...p }; for (const [k, x] of Object.entries(v)) if (x) u.set(k, x); return `/village/events${u.size ? `?${u}` : ""}`; };

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ title: "Events" }}
      aside={r.ctx.minor ? <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink"><b>Under 18?</b> Your guardian is told when you register. We send reminders 1 day and 1 hour before.</section> : undefined}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Events</h1><p className="mt-1 text-[16px] text-bark">Live chats, panels and workshops with mentors.</p></div>
      <h1 className="sr-only lg:hidden">Events</h1>
      <nav aria-label="Events" className="flex gap-2">
        {TABS.map(([k, l]) => <Link key={k} href={href({ tab: k === "upcoming" ? undefined : k })} aria-current={tab === k ? "page" : undefined} className={cn("rounded-full px-4 py-2 text-[14px] font-semibold", tab === k ? "bg-forest text-forest-ink" : "bg-sand")}>{l}{k === "mine" && mine ? ` ${mine}` : ""}</Link>)}
      </nav>
      {tab !== "past" && types.length > 1 && (
        <nav aria-label="Type" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
          {[undefined, ...types].map((t) => <Link key={t ?? "all"} href={href({ type: t })} className={cn("whitespace-nowrap rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold", (searchParams.type ?? undefined) === t ? "bg-ink text-paper" : "bg-sand")}>{t ?? "All events"}</Link>)}
        </nav>
      )}
      {tab === "past" ? (
        past.length ? past.map((e) => (
          <Card key={e.id} className="flex items-center gap-3.5 p-4">
            <DateTile month={new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), month: "short" }).format(e.startsAt).toUpperCase()} day={new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric" }).format(e.startsAt)} size="sm" tone="sand" />
            <div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-stone">Past event</p><p className="text-[15.5px] font-bold">{e.title}</p><p className="text-[13px] text-stone">{e.registrations.length} came{e.recordingKey ? " · recording in the Library" : ""}</p></div>
          </Card>
        )) : <Card className="p-6 text-center text-[15px] text-bark">No past events yet.</Card>
      ) : list.length ? list.map((e) => {
        const [kind, ...rest] = e.title.split(": ");
        return (
          <Card key={e.id} className="flex flex-col gap-3 p-4 lg:p-5">
            <Link href={`/village/events/${e.id}`} className="flex items-start gap-3.5">
              <DateTile month={e.month} day={e.day} tone={e.registered ? "mint" : "butter"} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5"><span className="rounded-full bg-sand px-[11px] py-1 text-[12px] font-semibold">{rest.length ? kind : "Event"}</span><span className="rounded-full bg-sand px-[11px] py-1 text-[12px] font-semibold">Free</span></div>
                <p className="mt-1.5 font-display text-[19px] font-extrabold leading-[1.15] tracking-[-.01em]">{rest.length ? rest.join(": ") : e.title}</p>
                <p className="mt-1 text-[13px] text-stone">{e.meta}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3"><GoingButton id={e.id} going={e.registered} />{e.registered && r.ctx.minor && <span className="text-[12.5px] text-stone">Your guardian has been told.</span>}</div>
          </Card>
        );
      }) : <Card className="flex flex-col items-center gap-2 p-6 text-center"><Icon name="calendar" size={28} className="text-stone" /><p className="text-[15px] text-bark">{tab === "mine" ? "You have not registered for anything yet." : "No events coming up. Check back soon."}</p></Card>}
    </ParticipantShell>
  );
}
