import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { Eyebrow, Gutter, H, IconTile, OTag, Pill, TONE, cycle, PAGE_STACK } from "@/components/public/kit";
import { MIN_AGE } from "@/lib/domain/age";
import { publicLibrary, type ResourceCard } from "@/lib/village";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";

export const metadata = { title: "Public library" };
export const dynamic = "force-dynamic";

const KINDS: [string, string][] = [["all", "All"], ["Answer", "Answers"], ["Template", "Templates"], ["Recording", "Recordings"]];

async function load(q?: string): Promise<ResourceCard[] | null> {
  try { return await publicLibrary(q); } catch (e) { console.error("publicLibrary failed", e); return null; }
}

/** P1 Public library. Approved, public resources only; no account needed. */
export default async function Library({ searchParams }: { searchParams: { q?: string; kind?: string } }) {
  const q = searchParams.q?.trim() || undefined;
  const kind = KINDS.some(([k]) => k === searchParams.kind) ? searchParams.kind! : "all";
  const all = await load(q);
  const cards = (all ?? []).filter((c) => kind === "all" || c.kind === kind);
  const href = (k: string) => { const p = new URLSearchParams(); if (q) p.set("q", q); if (k !== "all") p.set("kind", k); const s = p.toString(); return s ? `/library?${s}` : "/library"; };

  const chips = (phone: boolean) => (
    <ScrollX as="nav" variant="chips" bleed={4} label="kinds" aria-label="Kind" className={cn("flex gap-2", phone ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden" : "flex-wrap max-lg:hidden")}>
      {KINDS.map(([k, l]) => (
        <Link key={k} href={href(k)} aria-current={kind === k ? "page" : undefined} className={cn("dc-pill", kind === k ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>
          {phone && kind === k && <Icon name="check" size={16} />}{l}
        </Link>
      ))}
    </ScrollX>
  );
  const checked = <Pill tone="mint" icon="shieldCheck">Checked by the team</Pill>;

  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          <section className="pt-8 lg:pt-14">
            <Eyebrow>Public library</Eyebrow>
            <h1 className="mt-2.5 font-display text-[38px] font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-3 lg:text-[66px] lg:leading-none lg:tracking-[-.03em]">What the village already knows.</h1>
            <p className="mt-2.5 max-w-[640px] text-[16px] leading-normal text-bark lg:mt-4 lg:text-[19px]">Advice, templates and recordings from mentors<span className="max-lg:hidden"> in the community</span>. Open to everyone. No account needed.</p>
            <div className="mt-4 max-lg:hidden">{checked}</div>
          </section>

          <div className="flex flex-col gap-3.5 lg:gap-4 lg:pt-2">
            <form action="/library" role="search" className="flex gap-3">
              {kind !== "all" && <input type="hidden" name="kind" value={kind} />}
              <label className="flex h-[52px] flex-1 items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] text-[15px] text-stone focus-within:border-ink lg:h-14">
                <Icon name="search" size={19} />
                <input type="search" name="q" defaultValue={q} placeholder="Search the library" aria-label="Search the library" className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
              </label>
              <button type="submit" className="dc-btn dc-btn-primary h-14 max-lg:hidden">Search</button>
            </form>
            {chips(false)}
            {chips(true)}
            <div className="lg:hidden">{checked}</div>
          </div>

          {all === null ? (
            <p className="dc-card p-6 text-[15.5px] text-bark lg:mt-6">The library is not available right now. Please try again in a few minutes.</p>
          ) : cards.length === 0 ? (
            <p className="dc-card p-6 text-[15.5px] text-bark lg:mt-6">{q ? <>Nothing matches &ldquo;{q}&rdquo; yet. Try other words, or <Link href="/register" className="font-bold text-clay">ask the village</Link>.</> : "Nothing here yet. Mentors are writing the first answers now."}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3.5 lg:grid-cols-3 lg:gap-[18px] lg:pt-6">
              {cards.map((c, i) => {
                const t = TONE[cycle(i)];
                return (
                  <li key={c.id} className="flex">
                    <Link href={`/library/${c.id}`} className={cn("flex flex-1 flex-col gap-3 rounded-[28px] p-[22px] lg:min-h-[200px]", t.bg, t.ink)}>
                      <span><OTag>{c.kind}</OTag></span>
                      <span className="flex-1 font-display text-[22px] font-extrabold leading-[1.12] lg:text-[25px]">{c.title}</span>
                      <span className="flex items-center justify-between text-[13px] opacity-90">
                        <span>{[c.topic || c.cohort, c.kind].filter(Boolean).join(" · ")}</span>
                        <Icon name="arrowRight" size={20} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <section className="dc-card flex flex-col gap-4 p-[22px] lg:flex-row lg:items-center lg:gap-7 lg:rounded-[36px] lg:px-10 lg:py-9">
            <IconTile icon="message" tone="butter" size={64} iconSize={32} radius={16} className="max-lg:hidden" />
            <div className="flex-1">
              <H className="text-[24px] lg:text-[30px]">Want to ask someone directly?</H>
              <p className="mt-1.5 text-[15px] leading-normal text-bark lg:text-[16.5px]">The Ask the Village service is for people aged {MIN_AGE} and over. Under 18s join with a parent or guardian.</p>
            </div>
            <div className="flex flex-col-reverse gap-2.5 lg:flex-row lg:gap-7">
              <Link href="/login" className="dc-btn dc-btn-soft h-[50px] lg:h-14">Log in</Link>
              <Link href="/register" className="dc-btn dc-btn-primary h-[54px] lg:h-14"><Icon name="arrowRight" size={18} />Join the village</Link>
            </div>
          </section>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
