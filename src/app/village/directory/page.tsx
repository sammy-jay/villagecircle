import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, pastelAt } from "@/components/app/feed";
import { SelectField } from "@/components/forms/fields";
import { participantPage } from "@/lib/participant-ctx";
import { directoryFor, filterDirectory, type DirectoryCard, type DirectoryFilter } from "@/lib/village";
import { cn } from "@/lib/cn";

export const metadata = { title: "Explore the village" };
export const dynamic = "force-dynamic";

function MentorCard({ m, i }: { m: DirectoryCard; i: number }) {
  return (
    <Link href={`/village/directory/${m.id}`} className="flex flex-col gap-3 rounded-card border border-line bg-card p-[18px]">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold", PASTEL[pastelAt(i)].both)}>{m.initials}</span>
        <div className="min-w-0"><p className="text-[16px] font-bold">{m.name}</p><p className="text-[13px] text-stone">{[m.role, m.country].filter(Boolean).join(" · ")}</p></div>
      </div>
      {m.bio && <p className="line-clamp-2 text-[14px] leading-normal text-bark">{m.bio}</p>}
      <div className="flex flex-wrap gap-1.5">{m.expertise.slice(1, 3).map((e) => <span key={e} className="rounded-full bg-sand px-[11px] py-1.5 text-[12.5px] font-semibold">{e}</span>)}</div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-stone">{m.languages.join(", ")}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-mint px-[11px] py-1.5 text-[12px] font-semibold text-mint-ink"><span className="size-1.5 rounded-full bg-current" />Open to Asks</span>
      </div>
    </Link>
  );
}

/** D4 Explore with filters (N12) and the no-match state (N12-D2). Mentors are listed by thanks, then A to Z, never scored. */
export default async function Explore({ searchParams }: { searchParams: DirectoryFilter & { filters?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/village/directory" : r.to);
  const d = await directoryFor(r.ctx.userId);
  if (!d) redirect("/login");
  const f: DirectoryFilter = { q: searchParams.q, profession: searchParams.profession, language: searchParams.language, country: searchParams.country };
  const active = Object.entries(f).filter(([, v]) => v);
  const shown = filterDirectory(d.cards, f);
  const closest = shown.length === 0 && active.length > 1
    ? d.cards.filter((c) => active.filter(([k]) => k !== "q").map(([k, v]) => filterDirectory([c], { [k]: v }).length).filter(Boolean).length >= active.length - 1).slice(0, 4)
    : [];
  const label = (k: string, v: string) => k === "profession" ? d.professions.find((p) => p.code === v)?.label ?? v : v;
  const qs = (patch: Record<string, string | undefined>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ ...f, ...patch })) if (v) u.set(k, v); const s = u.toString(); return s ? `?${s}` : ""; };

  const filtersForm = (sheet: boolean) => (
    <form action="/village/directory" className={cn("flex flex-col gap-4", !sheet && "lg:flex-row lg:items-end lg:gap-3")}>
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <label className={cn("flex flex-col gap-[7px] text-[13px] font-bold text-bark", !sheet && "lg:flex-1")}>Career area<SelectField name="profession" options={d.professions.map((p) => ({ value: p.code, label: p.label }))} defaultValue={f.profession} placeholder="Any area" /></label>
      <label className={cn("flex flex-col gap-[7px] text-[13px] font-bold text-bark", !sheet && "lg:flex-1")}>Where the mentor is<SelectField name="country" options={d.countries.map((c) => ({ value: c, label: c }))} defaultValue={f.country} placeholder="Anywhere" /></label>
      <label className={cn("flex flex-col gap-[7px] text-[13px] font-bold text-bark", !sheet && "lg:flex-1")}>Language they speak<SelectField name="language" options={d.languages.map((l) => ({ value: l, label: l }))} defaultValue={f.language} placeholder="Any language" /></label>
      {sheet && <p className="text-[12.5px] text-stone">Filters only use what mentors chose to share. Nobody is ranked.</p>}
      <div className={cn("flex items-center gap-3", sheet ? "justify-between" : "lg:pb-0")}>
        {sheet && <Link href="/village/directory" className="text-[14.5px] font-bold">Clear all</Link>}
        <button type="submit" className={cn("dc-btn dc-btn-primary", sheet ? "h-[52px] flex-1" : "h-[54px]")}>{sheet ? `Show mentors` : "Apply"}</button>
      </div>
    </form>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ title: "Explore" }}>
      <div className="max-lg:hidden">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Explore the village</h1>
        <p className="mt-1 text-[16px] text-bark">Find someone who has been where you want to go. Mentors are never ranked.</p>
      </div>
      <h1 className="sr-only lg:hidden">Explore the village</h1>
      <form action="/village/directory" role="search" className="flex h-[52px] items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] focus-within:border-ink">
        <Icon name="search" size={20} className="text-stone" />
        {Object.entries(f).filter(([k, v]) => k !== "q" && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="q" defaultValue={f.q} placeholder="Search by name, job or topic" aria-label="Search mentors" className="min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-stone focus:outline-none" />
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/village/directory${qs({ filters: "1" })}`} scroll={false} className="inline-flex items-center gap-1.5 rounded-full bg-ink lg:hidden px-[13px] py-[7px] text-[13.5px] font-semibold text-paper"><Icon name="settings" size={16} />Filters{active.length ? ` ${active.length}` : ""}</Link>
        {active.map(([k, v]) => <Link key={k} href={`/village/directory${qs({ [k]: undefined })}`} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-[13px] py-[7px] text-[13.5px] font-semibold text-forest-ink">{label(k, v!)}<Icon name="x" size={14} /></Link>)}
      </div>
      <div className="max-lg:hidden">{filtersForm(false)}</div>
      {shown.length > 0 ? (
        <>
          <p className="text-[14px] text-bark">Showing <b>{shown.length} of {d.cards.length}</b> mentors.</p>
          <div className="grid gap-3.5 lg:grid-cols-2">{shown.map((m, i) => <MentorCard key={m.id} m={m} i={i} />)}</div>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-card bg-butter p-5 text-butter-ink lg:p-6">
            <h2 className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-.01em]">No exact match. Ask the village.</h2>
            <p className="text-[15px] leading-normal">Nobody on the roster fits every filter yet. Tell us what you need and the team will look for the right person by hand. You will hear back within 5 working days.</p>
            <div className="flex flex-wrap gap-2.5"><Link href="/asks/new" className="dc-btn dc-btn-primary h-[50px]"><Icon name="plus" size={18} />Ask the village</Link><Link href="/village/directory" className="dc-btn dc-btn-soft h-[50px]">Clear filters</Link></div>
          </section>
          {closest.length > 0 && (
            <section className="flex flex-col gap-3">
              <div><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Closest matches</h2><p className="text-[14px] text-stone">These fit {active.length - 1} of your {active.length} filters.</p></div>
              <div className="grid gap-3.5 lg:grid-cols-2">{closest.map((m, i) => <MentorCard key={m.id} m={m} i={i} />)}</div>
            </section>
          )}
          <Card className="p-5">
            <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Try this instead</h2>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-bark"><li>Remove the place. Many mentors help by video from anywhere.</li><li>Put a language in your Ask instead of a filter. The team can look for it.</li></ul>
          </Card>
        </>
      )}
      {searchParams.filters === "1" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
          <Link href={`/village/directory${qs({ filters: undefined })}`} aria-label="Close filters" className="absolute inset-0 bg-[rgba(20,16,10,.55)]" />
          <div role="dialog" aria-modal="true" aria-labelledby="flt" className="relative w-full rounded-t-[30px] bg-card px-5 pb-6 pt-3 lg:w-[560px] lg:rounded-[32px] lg:p-[30px]">
            <span className="mx-auto mb-3 block h-[5px] w-11 rounded-[3px] bg-line lg:hidden" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between"><h2 id="flt" className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">Filters</h2><Link href={`/village/directory${qs({ filters: undefined })}`} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-sand"><Icon name="x" size={20} /></Link></div>
            <p className="mb-4 text-[14.5px] text-bark">Narrow it down. You can always ask the village instead.</p>
            {filtersForm(true)}
          </div>
        </div>
      )}
    </ParticipantShell>
  );
}
