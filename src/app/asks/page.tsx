import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AskTag, ASK_TAG, type AskTagKey } from "@/components/dc";
import { ParticipantShell } from "@/components/app/app-shell";
import { AskCard, Card } from "@/components/app/feed";
import { AskDetails } from "@/components/app/ask-journey";
import { ClosedCard } from "./[id]/exit-views";
import { DeleteDraft } from "./delete-draft";
import { participantPage } from "@/lib/participant-ctx";
import { listOwnAsks } from "@/lib/asks";
import { trackerView } from "@/lib/connections";
import { waitingOnGuardianTime } from "@/lib/participant-home";
import { ASK_STAGES, stageNow } from "@/lib/domain/ask-stages";
import { MAX_OPEN_ASKS } from "@/lib/domain/limits";
import { isOpen } from "@/lib/domain/ask-state";
import { APP_TZ } from "@/lib/domain/scheduling";
import type { AskState } from "@prisma/client";
import { cn } from "@/lib/cn";

export const metadata = { title: "My Asks" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "short", day: "numeric", month: "short" }).format(d);
const when = (d: Date) => `${day(d)}, ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;

/** One line under each Ask title. The tag above it names the stage; this line says what that means for this Ask. */
function line(a: { state: string; mentorShort: string | null; scheduledAt: Date | null; returned: boolean; handMatching: boolean }, guardian: string) {
  switch (a.state) {
    case "DRAFT": return "Saved as a draft. It waits for 30 days.";
    case "AWAITING_GUARDIAN": return `Waiting for ${guardian} to approve it.`;
    case "SUBMITTED": case "IN_TEAM_REVIEW": return a.returned ? "The team asked for a little more detail." : ASK_STAGES[1].meaning;
    case "OPEN_TO_MENTORS": case "MENTOR_STEPPED_FORWARD": return a.handMatching ? "A team member is looking for the right mentor personally." : ASK_STAGES[2].meaning;
    case "CONNECTION_APPROVED": return `${a.mentorShort ?? "Your mentor"} is your mentor. Pick one of the times they offered.`;
    case "SCHEDULED": return a.scheduledAt ? `Booked: ${when(a.scheduledAt)} with ${a.mentorShort ?? "your mentor"}.` : "Booked.";
    case "HELD": case "COMPLETE": return ASK_STAGES[4].meaning;
    case "FOLLOW_UP_REQUESTED": return "You asked for a follow-up. The team is on it.";
    case "ONGOING_MENTORSHIP": return "You and your mentor keep going.";
    case "ANSWERED_BY_RESOURCE": return "The library answered it, so no mentor time was used.";
    case "LAPSED": return "Nobody stepped forward in time, so the team closed it. Your answers are saved.";
    case "WITHDRAWN": return "You withdrew it. Your answers are saved.";
    case "GUARDIAN_DECLINED": return `${guardian} did not approve it this time.`;
    case "REDIRECTED": return "The team pointed you to better help.";
    case "NOT_PROCEEDING": return "The team could not take this one forward.";
    default: return "";
  }
}

/** D13 My Asks: active and closed, the current one expanded with its journey. */
export default async function MyAsks({ searchParams }: { searchParams: { tab?: string; deleted?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/asks" : r.to);
  const own = await listOwnAsks(r.ctx.userId);
  if (!own) redirect("/login");
  const active = own.asks.filter((a) => a.state === "DRAFT" || isOpen(a.state as AskState) || a.state === "HELD");
  const closed = own.asks.filter((a) => !active.includes(a));
  const tab = searchParams.tab === "closed" ? "closed" : "active";
  const openN = own.asks.filter((a) => a.state !== "DRAFT" && isOpen(a.state as AskState)).length;
  const lead = active.find((a) => a.state !== "DRAFT");
  const t = lead ? await trackerView(r.ctx.userId, lead.id) : null;
  const guardian = t?.guardianName ?? "your guardian";

  const row = (a: (typeof own.asks)[number]) => {
    const stamp = a.state === "DRAFT" ? `Edited ${day(a.updatedAt)}` : a.exitedAt ? `Closed ${day(a.exitedAt)}` : a.submittedAt ? `Sent ${day(a.submittedAt)}` : "";
    const href = a.state === "DRAFT" ? `/asks/${a.id}/edit` : `/asks/${a.id}`;
    if (a.state === "DRAFT") return (
      <div key={a.id} className="flex flex-col gap-2 rounded-card border border-line bg-card p-[18px]">
        <div className="flex items-center gap-2.5">{a.state in ASK_TAG && <AskTag state={a.state as AskTagKey} />}<span className="text-[12.5px] text-stone">{stamp}</span></div>
        <Link href={href} className="font-display text-[19px] font-extrabold leading-[1.15] tracking-[-.01em] hover:text-clay">{a.title}</Link>
        <p className="text-[14px] leading-normal text-bark">{line(a, guardian)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={href} className="inline-flex items-center gap-1.5 text-[14px] font-bold text-forest"><Icon name="pencil" size={16} />Carry on</Link>
          <DeleteDraft askId={a.id} />
        </div>
      </div>
    );
    return (
      <Link key={a.id} href={href} className="flex flex-col gap-2 rounded-card border border-line bg-card p-[18px]">
        <div className="flex items-center gap-2.5">{a.state in ASK_TAG && <AskTag state={a.state as AskTagKey} />}<span className="text-[12.5px] text-stone">{stamp}</span></div>
        <p className="font-display text-[19px] font-extrabold leading-[1.15] tracking-[-.01em]">{a.title}</p>
        <p className="text-[14px] leading-normal text-bark">{line(a, guardian)}</p>
      </Link>
    );
  };
  const tabs = (
    <nav aria-label="My Asks" className="flex gap-2">
      {([["active", "Active", active.length], ["closed", "Closed", closed.length]] as const).map(([k, l, n]) => (
        <Link key={k} href={k === "active" ? "/asks" : "/asks?tab=closed"} aria-current={tab === k ? "page" : undefined} className={cn("rounded-full px-4 py-2 text-[14px] font-semibold", tab === k ? "bg-forest text-forest-ink" : "bg-sand")}>{l}&nbsp; {n}</Link>
      ))}
    </nav>
  );
  const openCard = (
    <Card className="flex flex-col gap-[9px] p-[18px]">
      <div className="flex items-center"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Open Asks</h2><span className="ml-auto font-display text-[20px] font-extrabold">{openN} of {MAX_OPEN_ASKS}</span></div>
      <div className="h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full rounded-[inherit] bg-forest" style={{ width: `${(openN / MAX_OPEN_ASKS) * 100}%` }} /></div>
      <p className="text-[13.5px] leading-normal text-bark">You can have up to three open Asks at once.{openN >= MAX_OPEN_ASKS ? " Close or finish one to start another." : ""} Drafts do not count.</p>
    </Card>
  );
  // The labels a participant sees, explained with the same sentences as the stages themselves.
  const legend = (
    <Card className="p-[18px]">
      <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What the labels mean</h2>
      <dl className="mt-3 flex flex-col gap-2.5">
        {([["AWAITING_GUARDIAN", "Your guardian approves your Ask before the team sees it."], ["IN_TEAM_REVIEW", ASK_STAGES[1].meaning], ["OPEN_TO_MENTORS", ASK_STAGES[2].meaning], ["CONNECTION_APPROVED", ASK_STAGES[3].meaning], ["COMPLETE", ASK_STAGES[4].meaning]] as const).filter(([k]) => own.minor || k !== "AWAITING_GUARDIAN").map(([k, s]) => (
          <div key={k} className="flex flex-col items-start gap-1"><dt><AskTag state={k} /></dt><dd className="text-[13.5px] text-bark">{s}</dd></div>
        ))}
      </dl>
    </Card>
  );
  const aside = (
    <>
      {openCard}
      {lead && (
        <Card className="flex flex-col gap-2.5 p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your question</h2>
          <p className="text-[14.5px] leading-normal text-bark">{lead.title}</p>
          <div className="flex gap-1.5"><span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{lead.topic}</span><span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{lead.sessionLength} min</span></div>
          {own.minor && lead.mentorShort && <p className="text-[13.5px] text-bark"><b>{t?.guardianName ?? "Your guardian"} approves the time.</b> {lead.mentorShort} never sees your name, school or contact details.</p>}
        </Card>
      )}
      {legend}
      <section className="flex flex-col gap-2.5 rounded-card bg-blush p-[18px] text-blush-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Need help?</h2>
        <p className="text-[13.5px] leading-normal">Something feels wrong? One tap pauses the Ask and tells our safeguarding lead.</p>
        <Link href={lead ? `/report?ask=${lead.id}` : "/report"} className="inline-flex items-center gap-1.5 self-start rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="flag" size={16} />Report a concern</Link>
      </section>
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ title: "My Asks" }}>
      <div className="flex items-end justify-between gap-3 max-lg:hidden">
        <div><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">My Asks</h1><p className="mt-1 text-[16px] text-bark">Everything you have asked, and where it is up to.</p></div>
        <Link href="/asks/new" className="dc-btn dc-btn-primary h-[50px]"><Icon name="plus" size={18} />New Ask</Link>
      </div>
      <h1 className="sr-only lg:hidden">My Asks</h1>
      {searchParams.deleted === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Draft deleted.</p>}
      {tabs}
      {tab === "active" ? (
        <>
          {/* The Ask that is furthest along: one card with its status and next step, the dated trail behind "Additional details". */}
          {lead && t && (stageNow(lead.state) !== null ? (
            <AskCard a={{ id: lead.id, state: lead.state, title: lead.title, mentor: lead.mentorShort, scheduledAt: lead.scheduledAt, waitingGuardian: waitingOnGuardianTime(t) }} guardian={own.minor ? t.guardianName : null}
              details={<AskDetails j={{ ...t, mentorShort: lead.mentorShort }} tone="butter" />} />
          ) : row(lead))}
          {active.filter((a) => a !== lead).map(row)}
          {active.length === 0 && <Card className="p-6 text-center text-[15px] text-bark">No open Asks. <Link href="/asks/new" className="font-bold text-clay">Ask the village something</Link>.</Card>}
          <div className="lg:hidden">{openCard}</div>
          {closed.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Closed lately</h2><Link href="/asks?tab=closed" className="text-[13.5px] font-bold text-clay">See all</Link></div>
              {closed.slice(0, 3).map(row)}
            </section>
          )}
        </>
      ) : (
        <>
          <p className="text-[15px] text-bark">Every ending has a plain explanation and a next step. Nobody is left wondering.</p>
          {closed.length ? closed.map((a) => ["HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"].includes(a.state) ? row(a) : <ClosedCard key={a.id} a={a} guardian={guardian} />) : <Card className="p-6 text-center text-[15px] text-bark">Nothing closed yet.</Card>}
        </>
      )}
      <div className="lg:hidden">{legend}</div>
    </ParticipantShell>
  );
}
