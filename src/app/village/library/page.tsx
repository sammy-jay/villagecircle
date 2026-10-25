import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, pastelAt } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { libraryFor } from "@/lib/village";
import { cn } from "@/lib/cn";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";

/** LIB Library for members: search, topic chips, newest first. Every item is approved and reviewed yearly. */
export default async function Library({ searchParams }: { searchParams: { q?: string; topic?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/village/library" : r.to);
  const lib = await libraryFor(r.ctx.userId);
  if (!lib) redirect("/login");
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const topics = [...new Map(lib.cards.filter((c) => c.topicSlug).map((c) => [c.topicSlug, c.topic])).entries()].slice(0, 6);
  const cards = lib.cards.filter((c) => (!q || `${c.title} ${c.topic} ${c.credit}`.toLowerCase().includes(q)) && (!searchParams.topic || c.topics.includes(searchParams.topic)));
  const [lead, ...rest] = cards;
  const saved = lib.cards.filter((c) => lib.saved.includes(c.id));
  const chip = (slug: string | undefined, label: string) => {
    const on = (searchParams.topic ?? "") === (slug ?? "");
    const p = new URLSearchParams(); if (searchParams.q) p.set("q", searchParams.q); if (slug) p.set("topic", slug);
    return <Link key={label} href={`/village/library${p.size ? `?${p}` : ""}`} aria-current={on ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold", on ? "bg-forest text-forest-ink" : "bg-sand")}>{label}</Link>;
  };
  const aside = (
    <>
      {saved.length > 0 && (
        <Card className="p-[18px]">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Saved</h2><Link href="/village/saved" className="text-[13.5px] font-bold text-clay">See all {saved.length}</Link></div>
          <ul className="mt-2.5 flex flex-col gap-2.5">{saved.slice(0, 3).map((s) => <li key={s.id}><Link href={`/village/library/${s.id}`} className="text-[14px] font-bold">{s.title}</Link><p className="text-[12.5px] text-stone">{s.credit} · {s.kind}</p></li>)}</ul>
        </Card>
      )}
      <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink"><b>Reviewed by the team.</b> Mentors write them, the team reads them first, and nothing here is advice from a stranger.</section>
      <Card className="flex flex-col gap-2 p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Cannot find it?</h2><p className="text-[14px] text-bark">Ask the village. A mentor may write the answer for everyone.</p><Link href="/asks/new" className="dc-btn dc-btn-soft h-11"><Icon name="plus" size={18} />Ask the village</Link></Card>
    </>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ title: "Library" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Library</h1><p className="mt-1 text-[16px] text-bark">Short reads, templates and recordings from mentors. Every one is checked by the team and reviewed once a year.</p></div>
      <h1 className="sr-only lg:hidden">Library</h1>
      <form action="/village/library" role="search" className="flex h-[52px] items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] focus-within:border-ink">
        <Icon name="search" size={20} className="text-stone" />{searchParams.topic && <input type="hidden" name="topic" value={searchParams.topic} />}
        <input name="q" defaultValue={searchParams.q} placeholder="Search the library" aria-label="Search the library" className="min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-stone focus:outline-none" />
      </form>
      <nav aria-label="Topics" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">{chip(undefined, "All")}{topics.map(([slug, name]) => chip(slug, name))}</nav>
      {lead ? (
        <>
          <Link href={`/village/library/${lead.id}`} className="flex flex-col gap-2 rounded-[28px] bg-butter p-5 text-butter-ink lg:p-7">
            <span className="text-[12.5px] font-extrabold tracking-[.05em] opacity-85">NEW THIS WEEK</span>
            <span className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[30px]">{lead.title}</span>
            <span className="text-[14px]">{lead.credit} · {lead.kind} · Reviewed {lead.reviewed}</span>
            <span className="dc-btn dc-btn-primary mt-2 h-[46px] self-start">Read</span>
          </Link>
          <div className="grid gap-3 lg:grid-cols-2">
            {rest.map((c, i) => (
              <Link key={c.id} href={`/village/library/${c.id}`} className={cn("flex min-h-[150px] flex-col gap-2 rounded-card p-[18px]", PASTEL[pastelAt(i)].both)}>
                <span className="self-start rounded-full border-[1.5px] border-current px-3 py-[5px] text-[12.5px] font-bold">{c.kind}</span>
                <span className="flex-1 font-display text-[18px] font-extrabold leading-[1.15]">{c.title}</span>
                <span className="text-[13px] opacity-85">{c.credit}</span>
              </Link>
            ))}
          </div>
        </>
      ) : <Card className="p-6 text-center text-[15px] text-bark">Nothing matches. <Link href="/village/library" className="font-bold text-clay">Clear the search</Link> or ask the village.</Card>}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
