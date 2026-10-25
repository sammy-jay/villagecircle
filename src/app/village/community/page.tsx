import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, EventCard } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { latestPosts, thanksWall, upcomingEvents } from "@/lib/village";
import { db } from "@/lib/db";
import { shortName } from "@/lib/domain/views";
import { cn } from "@/lib/cn";

export const metadata = { title: "Community" };
export const dynamic = "force-dynamic";

const TONES = ["bg-blush text-blush-ink", "bg-mint text-mint-ink", "bg-butter text-butter-ink"];

/** D9 Community: the thank-you wall, stories and events. Everything is read by the team first. */
export default async function Community({ searchParams }: { searchParams: { tab?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/village/community" : r.to);
  const tab = searchParams.tab === "stories" ? "stories" : "thanks";
  const prof = await db.participantProfile.findUnique({ where: { userId: r.ctx.userId } });
  const [wall, posts, events, held, mine] = await Promise.all([
    thanksWall(12), latestPosts({ minor: r.ctx.minor }, 10), upcomingEvents(r.ctx.userId, 3),
    prof ? db.connection.findMany({ where: { participantId: prof.id, ask: { state: { in: ["HELD", "COMPLETE"] } } }, include: { mentor: { include: { user: true } }, thanks: { where: { authorId: r.ctx.userId } } }, orderBy: { endedAt: "desc" } }) : [],
    db.thanks.findMany({ where: { authorId: r.ctx.userId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const toThank = held.filter((c) => c.thanks.length === 0);

  const aside = (
    <>
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Say thanks</h2>
        <p className="text-[14px] text-bark">Helped by a mentor? Write a few words. The team reads it before it goes up.</p>
        {toThank.length ? toThank.map((c) => <Link key={c.id} href={`/asks/${c.askId}/thanks`} className="flex items-center justify-between rounded-field border-2 border-line px-4 py-3 text-[15px] font-bold">{shortName(c.mentor.user.name)}<Icon name="chevronRight" size={18} className="text-stone" /></Link>)
          : <p className="text-[13px] text-stone">Only mentors you have talked with are listed. Nobody to thank yet.</p>}
      </Card>
      <Card className="p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">House rules</h2>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-[14px] text-bark">{["First names and age only", "No contact details", "Reactions, no comments", "Everything is reviewed first"].map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 text-forest" />{x}</li>)}</ul>
      </Card>
      {mine.length > 0 && (
        <Card className="p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your thank-yous</h2>
          <ul className="mt-2.5 flex flex-col gap-2.5">{mine.map((t) => <li key={t.id} className="text-[13.5px]"><p className="line-clamp-2 text-bark">&ldquo;{t.body || t.tags.join(", ")}&rdquo;</p><p className="text-[12px] font-semibold text-stone">{t.moderation === "APPROVED" ? (t.sharePublicly ? "On the wall" : "Sent privately") : t.moderation === "PENDING" ? "With the team" : "Not published"}</p></li>)}</ul>
        </Card>
      )}
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ title: "Community" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Community</h1><p className="mt-1 text-[16px] text-bark">Thank-yous, events and stories from the village. Everything is read by the team first.</p></div>
      <h1 className="sr-only lg:hidden">Community</h1>
      <nav aria-label="Community" className="flex gap-2">
        {([["thanks", "Thank-yous"], ["stories", "Stories"]] as const).map(([k, l]) => <Link key={k} href={k === "thanks" ? "/village/community" : "/village/community?tab=stories"} aria-current={tab === k ? "page" : undefined} className={cn("rounded-full px-4 py-2 text-[14px] font-semibold", tab === k ? "bg-forest text-forest-ink" : "bg-sand")}>{l}</Link>)}
      </nav>
      {tab === "thanks" ? (
        wall.length ? (
          <div id="thanks" className="grid gap-3 lg:grid-cols-2">
            {wall.map((t, i) => (
              <section key={t.id} className={cn("flex flex-col gap-3 rounded-card p-[18px]", TONES[i % 3])}>
                <p className="text-[13px]"><b>{t.who}</b>{t.tag && <span className="opacity-80"> · {t.tag}</span>}</p>
                <p className="flex-1 font-display text-[19px] font-bold leading-[1.25]">{t.quote}</p>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold opacity-85"><Icon name="shieldCheck" size={14} />Reviewed by the team</span>
              </section>
            ))}
          </div>
        ) : <Card className="p-6 text-center text-[15px] text-bark">No thank-yous on the wall yet.</Card>
      ) : posts.length ? posts.map((p) => <Card key={p.id} className="p-5"><p className="whitespace-pre-line text-[15.5px] leading-normal">{p.body}</p></Card>)
        : <Card className="p-6 text-center text-[15px] text-bark">No stories yet.</Card>}
      {events.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Coming up in the village</h2><Link href="/village/events" className="text-[13.5px] font-bold text-clay">All events</Link></div>
          {events.map((e) => <EventCard key={e.id} e={e} />)}
        </section>
      )}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
