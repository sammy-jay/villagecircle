import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, DateTile, PASTEL, pastelAt } from "@/components/app/feed";
import { SaveButton } from "@/components/app/feed-actions";
import { participantPage } from "@/lib/participant-ctx";
import { listSavedResources, upcomingEvents } from "@/lib/village";
import { cn } from "@/lib/cn";

export const metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

/** N01 Saved: resources you saved and events you registered for. Only you can see this page. */
export default async function Saved() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/village/saved" : r.to);
  const [res, evs] = await Promise.all([listSavedResources(r.ctx.userId), upcomingEvents(r.ctx.userId, 30)]);
  const going = evs.filter((e) => e.registered);
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/me", title: "Saved" }}
      aside={<Card className="p-[18px] text-[13.5px] leading-normal text-bark"><b className="text-ink">Your saves.</b> Resources from the Library and events you are going to. Saving something never tells anyone.</Card>}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Saved</h1><p className="mt-1 text-[16px] text-bark">Tips and events you want to come back to. Only you can see this page.</p></div>
      <h1 className="sr-only lg:hidden">Saved</h1>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Saved resources</h2><Link href="/village/library" className="text-[13.5px] font-bold text-clay">Library</Link></div>
        {res.length ? res.map((t, i) => (
          <Card key={t.id} className="flex items-center gap-3.5 p-4">
            <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", PASTEL[pastelAt(i)].both)}><Icon name={t.kind === "Template" ? "doc" : "book"} size={23} /></span>
            <Link href={`/village/library/${t.id}`} className="min-w-0 flex-1"><span className="block text-[12px] font-extrabold uppercase tracking-[.05em] text-clay">{t.kind}</span><span className="block text-[15.5px] font-bold">{t.title}</span><span className="block text-[13px] text-stone">{t.credit}</span></Link>
            <SaveButton id={t.id} saved />
          </Card>
        )) : (
          <Card className="flex flex-col items-center gap-2 p-6 text-center"><Icon name="bookmark" size={28} className="text-stone" /><p className="text-[15px] font-bold">Nothing saved yet</p><p className="text-[14px] text-bark">Tap Save on a tip and it waits for you here.</p><Link href="/village/library" className="dc-btn dc-btn-soft mt-1 h-11">Open the Library</Link></Card>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Events you are going to</h2><Link href="/village/events" className="text-[13.5px] font-bold text-clay">All events</Link></div>
        {going.length ? going.map((e) => (
          <Link key={e.id} href={`/village/events/${e.id}`} className="flex items-center gap-3.5 rounded-card border border-line bg-card p-4"><DateTile month={e.month} day={e.day} size="sm" tone="mint" /><div className="min-w-0"><p className="text-[15.5px] font-bold">{e.title}</p><p className="text-[13px] text-stone">{e.meta}</p></div></Link>
        )) : <Card className="flex flex-col items-center gap-2 p-6 text-center"><p className="text-[15px] font-bold">No events yet</p><p className="text-[14px] text-bark">Register for an event and it waits for you here.</p><Link href="/village/events" className="dc-btn dc-btn-soft mt-1 h-11">See upcoming events</Link></Card>}
      </section>
    </ParticipantShell>
  );
}
