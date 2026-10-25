import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, type Pastel } from "@/components/app/feed";
import { StepTrail } from "@/components/public/kit";
import { whenLong } from "@/components/app/ask-journey";
import { APP_TZ } from "@/lib/domain/scheduling";
import type { trackerView } from "@/lib/connections";
import { reopenAction } from "@/app/asks/actions";
import { cn } from "@/lib/cn";
import { ReturnedForm } from "./returned-form";
import { WithdrawDialog } from "./withdraw-dialog";

type T = NonNullable<Awaited<ReturnType<typeof trackerView>>>;
type Ctx = { name: string; openCount: number; unread: boolean };
const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short" }).format(d);

/** EX8 card: a plain explanation and one next step for each way an Ask can end. */
export function ClosedCard({ a, guardian }: { a: { id: string; state: string; title: string; exitedAt: Date | null }; guardian: string }) {
  const g = guardian;
  const C: Record<string, { tag: string; tone: Pastel; head: string; body: string; next: string; cta?: [string, "reopen" | "note" | "edit" | "new"] }> = {
    NOT_PROCEEDING: { tag: "Not proceeding", tone: "blush", head: "Your Ask is not going ahead", body: "After reading it, our team decided we are not the right place for this one. You did nothing wrong.", next: "Read the team's note and start a new Ask if you like.", cta: ["Read the note", "note"] },
    LAPSED: { tag: "Lapsed", tone: "butter", head: "Nobody stepped forward in time", body: "We tried twice, then closed the Ask kindly. Your answers are saved.", next: "Reopen with the same answers, or choose a different topic.", cta: ["Reopen this Ask", "reopen"] },
    GUARDIAN_DECLINED: { tag: "Guardian declined", tone: "blush", head: `${g[0]!.toUpperCase()}${g.slice(1)} did not approve this Ask`, body: `${g[0]!.toUpperCase()}${g.slice(1)} chose not to approve it. We do not share why. You may want to talk it through together.`, next: "Edit your Ask and send it again.", cta: ["Edit and send again", "edit"] },
    WITHDRAWN: { tag: "Withdrawn", tone: "butter", head: "You withdrew this Ask", body: "Nothing counts against you, and your answers are saved.", next: "Reopen it with the same answers whenever you are ready.", cta: ["Reopen this Ask", "reopen"] },
    ANSWERED_BY_RESOURCE: { tag: "Answered by resource", tone: "mint", head: "The library answered it", body: "No mentor time was used. Good find.", next: "Still curious? Reopen it with the same answers.", cta: ["Reopen this Ask", "reopen"] },
    REDIRECTED: { tag: "Redirected", tone: "mint", head: "Someone else can help better", body: "The team pointed you to the right kind of help.", next: "See where to go instead.", cta: ["See the options", "note"] },
  };
  const c = C[a.state]; if (!c) return null;
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={cn("rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", PASTEL[c.tone].both)}>{c.tag}</span>
        <span className="text-[12.5px] text-stone">{a.title}{a.exitedAt && <> &middot; Closed {day(a.exitedAt)}</>}</span>
      </div>
      <h3 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">{c.head}</h3>
      <p className="text-[14.5px] leading-normal text-bark">{c.body}</p>
      <div className="rounded-field bg-sand px-4 py-3">
        <p className="text-[12px] font-extrabold tracking-[.05em] text-stone">WHAT YOU CAN DO</p>
        <p className="mt-1 text-[14.5px]">{c.next}</p>
      </div>
      {c.cta && (c.cta[1] === "reopen" || c.cta[1] === "edit" ? (
        <form action={reopenAction}><input type="hidden" name="askId" value={a.id} /><button type="submit" className="dc-btn dc-btn-primary h-[46px]">{c.cta[0]}</button></form>
      ) : <Link href={`/asks/${a.id}`} className="dc-btn dc-btn-soft h-[46px] self-start">{c.cta[0]}</Link>)}
    </section>
  );
}

const TeamNote = ({ note }: { note: string }) => (
  <section className="flex gap-3.5 rounded-card border border-line bg-card p-5">
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[15px] font-bold text-mint-ink">TV</span>
    <div><p className="text-[12px] font-extrabold tracking-[.05em] text-stone">FROM THE TEAM</p><p className="mt-1.5 font-display text-[18px] font-bold leading-[1.35]">&ldquo;{note}&rdquo;</p><p className="mt-2 text-[12.5px] text-stone">Written by a team member</p></div>
  </section>
);

function Hero({ eyebrow, title, body, tone }: { eyebrow: string; title: string; body: React.ReactNode; tone: Pastel }) {
  return (
    <section className={cn("rounded-[30px] p-6 lg:rounded-[32px] lg:px-8 lg:py-[28px]", PASTEL[tone].both)}>
      <p className="text-[12.5px] font-extrabold uppercase tracking-[.06em] opacity-85">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[30px] font-extrabold leading-[1.06] tracking-[-.02em] lg:text-[38px]">{title}</h1>
      <p className="mt-2 text-[15.5px] leading-normal lg:text-[16.5px]">{body}</p>
    </section>
  );
}

/** EX5 returned for detail, EX6 hand-matching, EX7 redirected, EX8 closed (one Ask). */
export function ExitView({ t, ctx, title, withdrawn, withdraw }: { t: T; ctx: Ctx; title: string; withdrawn?: boolean; withdraw?: boolean }) {
  const g = t.guardianName ?? "your guardian";
  const back = `/asks/${t.id}`;
  let body: React.ReactNode; let aside: React.ReactNode = null;

  if (t.state === "IN_TEAM_REVIEW" && t.reason === "R_THIN") {
    body = (
      <>
        <Hero eyebrow="Your Ask needs a little more" title="A few answers need a little more" body="A team member read your Ask and wants to give a mentor enough to work with. Nothing is lost." tone="butter" />
        {t.teamNote && <TeamNote note={t.teamNote} />}
        <ReturnedForm askId={t.id} a={{ q1: t.answers.q1, q2: t.answers.q2, q3: t.answers.q3 }} title={title} />
      </>
    );
    aside = (
      <>
        <Card className="p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {[["You add detail", t.minor ? "Your guardian does not need to approve again for small edits" : "Small edits go straight back"], ["The team reads it again", "Within 2 working days"], ["Mentors see it", "Names and school are removed first"]].map(([a, b], i) => (
              <li key={a} className="flex items-start gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[15px] font-extrabold", PASTEL[(["butter", "mint", "blush"] as const)[i]!].both)}>{i + 1}</span><div><p className="text-[15px] font-extrabold">{a}</p><p className="text-[13.5px] text-stone">{b}</p></div></li>
            ))}
          </ol>
        </Card>
        <section className="rounded-card bg-blush p-[18px] text-blush-ink"><h2 className="font-display text-[18px] font-extrabold">14 days to update</h2><p className="mt-1.5 text-[13.5px] leading-normal">If it is quiet after that, your Ask is saved as a draft and closes gently.</p></section>
      </>
    );
  } else if (t.handMatching && !["WITHDRAWN", "LAPSED", "NOT_PROCEEDING"].includes(t.state)) {
    body = (
      <>
        <Hero eyebrow="Hand-matching" title="We are finding the right person" body={<><b>This is not a no.</b> Sometimes the person with your exact experience is not on the platform yet. We will tell you the moment someone is found.</>} tone="mint" />
        <Card className="p-5 lg:p-6">
          <h2 className="mb-4 font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Where things stand</h2>
          <StepTrail steps={[
            { title: "Sent", sub: t.marks.submitted ? `${day(t.marks.submitted)}${t.minor ? ", approved by your guardian" : ""}` : "Sent", state: "done" },
            { title: "Read by the team", sub: "Summary written, no names", state: "done" },
            { title: "Shared with mentors", sub: "Nobody has stepped forward yet", state: "done" },
            { title: "A team member is looking personally", sub: "We are asking people outside the first list. Usually within 5 working days.", state: "current" },
            { title: "A mentor steps forward", sub: "We will tell you right away", state: "next" },
            { title: "Time booked", sub: t.minor ? "You pick, your guardian approves" : "You pick a time", state: "next" },
          ]} />
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Your options</h2>
          <p className="text-[14.5px] text-bark">Waiting is fine. If you would rather stop, you can close your Ask. Closing never counts against you.</p>
          <Link href={`${back}?withdraw=1`} className="dc-btn dc-btn-ghost h-[46px] self-start">Close my Ask</Link>
        </Card>
      </>
    );
    aside = (
      <>
        <Card className="flex flex-col gap-2 p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your Ask</h2><p className="text-[13px] text-stone">{t.topic}. {t.answers.sessionLength} minutes.</p><p className="text-[14.5px] leading-normal text-bark">{t.answers.q1}</p></Card>
        <section className="rounded-card bg-butter p-[18px] text-butter-ink"><h2 className="font-display text-[18px] font-extrabold">Usually 5 working days</h2><p className="mt-1.5 text-[13.5px] leading-normal">A person on the team is asking around for you. We will message you{t.minor ? " and your guardian" : ""} when someone steps forward.</p></section>
      </>
    );
  } else if (t.state === "REDIRECTED") {
    body = (
      <>
        <Hero eyebrow="Redirected" title="We think someone else can help you better" body="Your Ask was closed as Redirected. No mentor time was used, and nothing counts against you." tone="mint" />
        {t.teamNote && <TeamNote note={t.teamNote} />}
        {t.redirectLinks.length > 0 && (
          <Card className="p-5">
            <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Where to go instead</h2>
            <ul className="mt-2">
              {t.redirectLinks.map((l, i) => (
                <li key={l.title} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
                  <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", PASTEL[(["mint", "butter", "blush"] as const)[i % 3]].both)}><Icon name={i === 0 ? "users" : "compass"} size={23} /></span>
                  <div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{l.title}</p>{l.note && <p className="text-[13.5px] text-stone">{l.note}</p>}</div>
                  {i === 0 && <span className="rounded-full bg-mint px-[11px] py-1.5 text-[12px] font-semibold text-mint-ink">Recommended</span>}
                  {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="rounded-full bg-sand px-[13px] py-[7px] text-[13px] font-semibold">Open</a>}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card className="flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Still want a conversation?</h2>
          <p className="text-[14.5px] text-bark">If part of your question is about experience, such as what the path looked like, you can send a new Ask about that part.</p>
          <Link href="/asks/new" className="dc-btn dc-btn-primary h-[46px] self-start"><Icon name="plus" size={18} />Start a new Ask</Link>
        </Card>
      </>
    );
    aside = (
      <>
        <Card className="flex flex-col gap-1.5 p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your closed Ask</h2><p className="text-[14.5px] text-bark">{title}</p><p className="text-[13px] text-stone">{t.exitedAt ? `Closed ${day(t.exitedAt)}. ` : ""}Redirected.</p></Card>
        <section className="rounded-card bg-butter p-[18px] text-[13.5px] leading-normal text-butter-ink"><b>Mentors share experience, not licensed advice.</b> This reminder appears on every Ask.</section>
        <section className="rounded-card bg-blush p-[18px] text-[13.5px] leading-normal text-blush-ink"><b>Need to talk to someone right now?</b> Real help is available at any hour. <Link href="/crisis" className="font-bold underline">Get support</Link></section>
      </>
    );
  } else {
    body = (
      <>
        <div><h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[36px]">Closed Ask</h1><p className="mt-1 text-[15.5px] text-bark">Every ending has a plain explanation and a next step.</p></div>
        {withdrawn && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Withdrawn. {t.minor ? "Your guardian has been told." : ""}</p>}
        <ClosedCard a={{ id: t.id, state: t.state, title, exitedAt: t.exitedAt }} guardian={g} />
        {t.teamNote && (t.state === "NOT_PROCEEDING") && <TeamNote note={t.teamNote} />}
      </>
    );
    aside = (
      <>
        <section className="rounded-card bg-mint p-[18px] text-mint-ink"><h2 className="font-display text-[18px] font-extrabold">Nothing is lost</h2><p className="mt-1.5 text-[13.5px] leading-normal">Your answers stay saved for 30 days, so starting again is quick.</p></section>
        <section className="rounded-card bg-butter p-[18px] text-butter-ink"><h2 className="font-display text-[18px] font-extrabold">Closing never counts against you</h2><p className="mt-1.5 text-[13.5px] leading-normal">There are no marks, scores or rankings. Asking again is always fine.</p></section>
        {t.minor && <section className="rounded-card border border-line bg-card p-[18px] text-[13.5px] leading-normal text-bark"><b className="text-ink">Under 18?</b> Your guardian is told the Ask ended, never that you did anything wrong. We do not share why they said no.</section>}
      </>
    );
  }

  return (
    <ParticipantShell ctx={ctx} aside={aside} phone={{ back: "/asks", title: "Your Ask" }}>
      <Link href="/asks" className="dc-btn dc-btn-soft h-10 self-start px-4 text-[14.5px] max-lg:hidden"><Icon name="chevronLeft" size={18} />All my Asks</Link>
      {body}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
      {t.handMatching && withdraw && <WithdrawDialog askId={t.id} back={back} minor={t.minor} shared={false} />}
      {t.marks.submitted && <p className="text-center text-[12.5px] text-stone">Sent {whenLong(t.marks.submitted)}</p>}
    </ParticipantShell>
  );
}

