import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment } from "react";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, DateTile, PASTEL, pastelAt } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { directoryFor, filterDirectory, libraryFor, upcomingEvents } from "@/lib/village";
import { cn } from "@/lib/cn";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/** Bolds every occurrence of the search words. */
function Hit({ text, q }: { text: string; q: string }) {
  const words = q.trim().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "ig"));
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className="text-ink">{p}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

const TYPES = [["all", "All"], ["mentors", "Mentors"], ["tips", "Tips"], ["events", "Events"]] as const;

/** N03 Search: mentor names and topics, the Library and events. Never Asks. */
export default async function Search({ searchParams }: { searchParams: { q?: string; type?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/search" : r.to);
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const type = TYPES.some(([k]) => k === searchParams.type) ? searchParams.type! : "all";
  const [dir, lib, evs] = await Promise.all([directoryFor(r.ctx.userId), libraryFor(r.ctx.userId), upcomingEvents(r.ctx.userId, 30)]);
  const term = q.toLowerCase();
  const mentors = q ? filterDirectory(dir?.cards ?? [], { q }) : [];
  const tips = q ? (lib?.cards ?? []).filter((c) => `${c.title} ${c.topic} ${c.credit}`.toLowerCase().includes(term)) : [];
  const events = q ? evs.filter((e) => `${e.title} ${e.meta}`.toLowerCase().includes(term)) : [];
  const counts = { all: mentors.length + tips.length + events.length, mentors: mentors.length, tips: tips.length, events: events.length };
  const show = (k: string) => type === "all" || type === k;
  const topics = ["Careers", "School and exams", "Money", "Studying abroad"];

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/home", title: "Search" }}
      aside={<Card className="p-[18px] text-[13px] text-stone">Search only looks at mentor names, topics, the Library and events. Never at Asks.</Card>}>
      <form action="/search" role="search" className="flex h-[54px] items-center gap-2.5 rounded-full border-2 border-ink bg-card px-[18px]">
        <Icon name="search" size={20} className="text-stone" />
        <input name="q" defaultValue={q} autoFocus placeholder="Search mentors, tips and events" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-stone focus:outline-none" />
        {type !== "all" && <input type="hidden" name="type" value={type} />}
      </form>
      {q && (
        <>
          <div className="max-lg:hidden"><p className="text-[13px] font-extrabold tracking-[.04em] text-clay">SEARCH RESULTS</p><h1 className="font-display text-[36px] font-extrabold leading-[1.12] tracking-[-.01em]">{q}</h1></div>
          <nav aria-label="Result type" className="flex flex-wrap gap-2">
            {TYPES.map(([k, l]) => <Link key={k} href={`/search?q=${encodeURIComponent(q)}${k === "all" ? "" : `&type=${k}`}`} aria-current={type === k ? "page" : undefined} className={cn("rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold", type === k ? "bg-forest text-forest-ink" : "bg-sand")}>{l} {counts[k]}</Link>)}
          </nav>
        </>
      )}
      {q && counts.all === 0 && (
        <section className="flex flex-col gap-3 rounded-card bg-butter p-5 text-butter-ink">
          <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Nothing for &ldquo;{q}&rdquo; yet</h2>
          <p className="text-[14.5px] leading-normal">Try fewer words or a topic. Or ask the village and a mentor may write the answer for everyone.</p>
          <div className="flex flex-wrap gap-2">{topics.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="rounded-full bg-card px-[13px] py-[7px] text-[13.5px] font-semibold text-ink">{t}</Link>)}</div>
        </section>
      )}
      {show("mentors") && mentors.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Mentors</h2>
          {mentors.slice(0, type === "mentors" ? 50 : 4).map((m, i) => (
            <Link key={m.id} href={`/village/directory/${m.id}`} className="flex items-center gap-3 rounded-card border border-line bg-card p-4">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold", PASTEL[pastelAt(i)].both)}>{m.initials}</span>
              <div className="min-w-0 flex-1"><p className="text-[16px] font-bold"><Hit text={m.name} q={q} /></p><p className="text-[13px] text-stone">{[m.role, m.country].filter(Boolean).join(" · ")}</p>{m.bio && <p className="mt-1 line-clamp-1 text-[14px] text-bark"><Hit text={m.bio} q={q} /></p>}</div>
              <span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold max-lg:hidden">View</span>
            </Link>
          ))}
        </section>
      )}
      {show("tips") && tips.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Tips and resources</h2>
          {tips.slice(0, type === "tips" ? 50 : 4).map((t) => (
            <Link key={t.id} href={`/village/library/${t.id}`} className="flex flex-col gap-1 rounded-card border border-line bg-card p-4">
              <span className="text-[12px] font-extrabold uppercase tracking-[.05em] text-clay">{t.kind}</span>
              <span className="font-display text-[18px] font-extrabold leading-[1.15]"><Hit text={t.title} q={q} /></span>
              <span className="text-[13px] text-stone">{t.credit}{t.topic && ` · ${t.topic}`}</span>
            </Link>
          ))}
        </section>
      )}
      {show("events") && events.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Events</h2>
          {events.slice(0, type === "events" ? 50 : 3).map((e) => (
            <Link key={e.id} href={`/village/events/${e.id}`} className="flex items-center gap-3.5 rounded-card border border-line bg-card p-4">
              <DateTile month={e.month} day={e.day} size="sm" tone="butter" />
              <div className="min-w-0"><p className="text-[15.5px] font-bold"><Hit text={e.title} q={q} /></p><p className="text-[13px] text-stone">{e.meta}</p></div>
            </Link>
          ))}
        </section>
      )}
      <section className="flex flex-col gap-2.5 rounded-card bg-mint p-5 text-mint-ink">
        <p className="text-[12px] font-extrabold tracking-[.05em] opacity-80">ASK THE VILLAGE INSTEAD</p>
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12]">{q ? "Not quite what you need?" : "Looking for something?"}</h2>
        <p className="text-[14px] leading-normal">Tell the village what you are working out. A mentor may write the answer, or meet you on a call. The team reads your Ask first.</p>
        <Link href={`/asks/new${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="dc-btn dc-btn-primary h-[46px] self-start"><Icon name="plus" size={18} />Ask the village</Link>
      </section>
    </ParticipantShell>
  );
}
