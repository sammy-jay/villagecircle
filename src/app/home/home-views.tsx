import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import {
  AskCard, Card, ComingUp, Composer, EventCard, GoalCard, GuardianNote, LibraryCard, PASTEL, Pill, ThanksWallCard, TipCard, TOPIC_STARTERS, Villagers, VillagerRail, pastelAt, starterHref,
} from "@/components/app/feed";
import { AskDetails } from "@/components/app/ask-journey";
import type { HomeData } from "@/lib/participant-home";
import { cn } from "@/lib/cn";

/** D1 feed, or N09 Welcome until the first Ask is sent. `overlay` renders on top (D2a Quick Ask). */
export function HomeView({ h, ctx, overlay }: { h: HomeData; ctx: Ctx; overlay?: React.ReactNode }) {
  return <>{h.welcome ? <Welcome h={h} ctx={ctx} /> : <Feed h={h} ctx={ctx} />}{overlay}</>;
}

export type Ctx = { name: string; openCount: number; unread: boolean };

function Feed({ h, ctx }: { h: HomeData; ctx: Ctx }) {
  const [tip1, tip2, ...moreTips] = h.tips;
  const lib = moreTips.at(-1);
  const aside = (
    <>
      {h.goal && <GoalCard g={h.goal} />}
      {h.events.length > 0 && <ComingUp events={h.events} />}
      {h.mentors.length > 0 && <Villagers mentors={h.mentors.slice(0, 3)} />}
      {h.guardian && <GuardianNote first={h.guardian.first}>{h.active?.state === "CONNECTION_APPROVED" ? "The time you pick waits for their yes." : undefined}</GuardianNote>}
    </>
  );
  return (
    <ParticipantShell ctx={ctx} aside={aside} phone={{ title: "Village" }}>
      <div className="flex items-end justify-between gap-3 max-lg:hidden">
        <div>
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">{h.dateLine}</p>
          <h1 className="mt-1.5 whitespace-nowrap font-display text-[34px] font-extrabold leading-[1.12] tracking-[-.01em]">{h.greeting}, {h.first}</h1>
        </div>
        {h.guardian?.approved && <Pill icon="shieldCheck" className="bg-mint text-mint-ink">Guardian approved</Pill>}
      </div>
      <h1 className="sr-only lg:hidden">{h.greeting}, {h.first}</h1>
      <Composer first={h.first} />
      {h.active && <AskCard a={h.active} guardian={h.guardian?.first} details={h.track ? <AskDetails j={h.track} tone="butter" /> : undefined} />}
      {tip1 && <TipCard t={tip1} i={0} saved={h.saved.has(tip1.id)} />}
      {h.goal && <div className="lg:hidden"><GoalCard g={h.goal} compact /></div>}
      {h.mentors.length > 0 && <div className="lg:hidden"><VillagerRail mentors={h.mentors} /></div>}
      {tip2 && <TipCard t={tip2} i={1} saved={h.saved.has(tip2.id)} />}
      {h.thanks && <ThanksWallCard t={h.thanks} />}
      {h.events[0] && <EventCard e={h.events[0]} />}
      {lib && <LibraryCard t={lib} />}
      {!h.active && !tip1 && <Card className="p-6 text-center"><p className="text-[15px] text-bark">Nothing new yet. Ask the village something and it will show up here.</p></Card>}
    </ParticipantShell>
  );
}

function Welcome({ h, ctx }: { h: HomeData; ctx: Ctx }) {
  const done = [true, h.steps.profileDone, h.steps.askSent, h.steps.timePicked];
  const n = done.filter(Boolean).length;
  const current = done.findIndex((d) => !d);
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(h.steps.accountAt);
  const steps: [string, string, string?][] = [
    ["Create your account", `Done ${when}`],
    ["Finish your profile", "Pick your stage and a goal. 2 minutes.", "/onboarding"],
    ["Send your first Ask", "A short question. The team reads it first.", "/asks/new"],
    ["Pick a time with your mentor", "Opens after a mentor steps forward."],
  ];
  const pct = n * 25;
  const aside = (
    <>
      {h.mentors.length > 0 && <Villagers mentors={h.mentors.slice(0, 3)} title="Mentors to meet" ring />}
      {h.tips.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Library picks</h2>
          <ul className="mt-1.5">
            {h.tips.slice(0, 3).map((t, i) => (
              <li key={t.id} className={cn(i > 0 && "border-t border-line")}><Link href={`/village/library/${t.id}`} className="flex items-center gap-3.5 py-3.5">
                <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", PASTEL[(["butter", "mint", "blush"] as const)[i % 3]].both)}><Icon name={i % 2 ? "compass" : "doc"} size={23} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-bold">{t.title}</span><span className="mt-0.5 block text-[13.5px] text-stone">{t.credit} · {t.kind}</span></span>
                <Icon name="chevronRight" size={18} className="text-stone" />
              </Link></li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
  return (
    <ParticipantShell ctx={ctx} aside={aside} phone={{ title: "Village" }}>
      <section className="flex items-center gap-6 rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[32px] lg:px-8 lg:py-[30px]">
        <div className="min-w-0 flex-1">
          <p className="mb-2.5 text-[12.5px] font-extrabold tracking-[.05em] opacity-85">WELCOME, {h.first.toUpperCase()}</p>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.04] tracking-[-.02em] lg:text-[38px]">Welcome to the village</h1>
          <p className="mt-2.5 max-w-[420px] text-[15.5px] leading-normal lg:text-[16px]">Four small steps and you are ready.<span className="max-lg:hidden"> Nobody here is judging your questions.</span></p>
        </div>
        <span className="flex size-[92px] shrink-0 items-center justify-center rounded-full max-lg:size-20" style={{ background: `conic-gradient(rgb(var(--butter-ink)) 0 ${pct}%, rgba(255,255,255,.65) ${pct}% 100%)` }}>
          <span className="flex size-[70px] items-center justify-center rounded-full bg-butter font-display text-[25px] font-extrabold max-lg:size-[60px] max-lg:text-[21px]">{n}/4</span>
        </span>
      </section>
      <Card className="p-5 lg:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[24px]">Your first 4 steps</h2>
          <span className="text-[13.5px] font-bold text-stone">{n} of 4<span className="max-lg:hidden"> done</span></span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full rounded-[inherit] bg-forest" style={{ width: `${pct}%` }} /></div>
        <ol className="mt-1">
          {steps.map(([t, s, href], i) => {
            const isDone = done[i]; const isNow = i === current;
            return (
              <li key={t} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
                {isDone ? <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={18} strokeWidth={3} /></span>
                  : isNow ? <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-clay font-display font-extrabold text-clay-ink shadow-[0_0_0_5px_rgb(var(--clay)/.2)]">{i + 1}</span>
                  : <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line font-display text-[14px] font-extrabold text-stone">{i + 1}</span>}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[16px]", isNow ? "font-extrabold" : "font-bold", !isDone && !isNow && "text-stone")}>{t}</p>
                  <p className="mt-0.5 text-[13.5px] text-stone">{s}</p>
                </div>
                {isNow && href && <Link href={href} className="dc-btn dc-btn-forest h-10 px-[22px]">Start</Link>}
              </li>
            );
          })}
        </ol>
      </Card>
      <Card className="p-[18px]">
        <Link href="/asks/new" className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush font-display text-[16px] font-bold text-blush-ink">{h.first.charAt(0)}</span>
          <span className="flex h-12 flex-1 items-center rounded-full bg-sand px-[18px] text-[15.5px] text-stone">What is on your mind, {h.first}?</span>
        </Link>
        <p className="mt-3.5 text-[13px] font-extrabold tracking-[.04em] text-stone">PICK A TOPIC FOR YOUR FIRST ASK</p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {TOPIC_STARTERS.slice(0, 6).map((s, i) => {
            const t = PASTEL[pastelAt(i)];
            return (
              <Link key={s.topic} href={starterHref(s.topic)} className={cn("flex min-h-[96px] flex-col gap-2.5 rounded-[22px] p-4", t.both)}>
                <span className="flex size-[38px] items-center justify-center rounded-tile bg-card"><Icon name={s.icon} size={21} /></span>
                <span className="font-display text-[16.5px] font-extrabold leading-[1.2]">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
      {h.guardian && <div className="lg:hidden"><GuardianNote first={h.guardian.first} /></div>}
    </ParticipantShell>
  );
}
