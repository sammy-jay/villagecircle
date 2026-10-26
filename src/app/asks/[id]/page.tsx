import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AskTag, ASK_TAG, type AskTagKey } from "@/components/dc";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { Journey, whenLong } from "@/components/app/ask-journey";
import { participantPage } from "@/lib/participant-ctx";
import { trackerView } from "@/lib/connections";
import { APP_TZ } from "@/lib/domain/scheduling";
import { isExit } from "@/lib/domain/ask-state";
import type { AskState } from "@prisma/client";
import { cn } from "@/lib/cn";
import { WithdrawInline } from "./withdraw-dialog";
import { ExitView } from "./exit-views";

export const metadata = { title: "Your Ask" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const tz = APP_TZ() === "Africa/Lagos" ? "WAT" : "";

/** D3 Ask journey. Exits and team returns (EX5 to EX8) render their own view. */
export default async function AskPage({ params, searchParams }: { params: { id: string }; searchParams: { picked?: string; withdrawn?: string; withdraw?: string; changed?: string; rebook?: string; followup?: string; thanked?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}` : r.to);
  const t = await trackerView(r.ctx.userId, params.id);
  if (!t) redirect("/asks");
  if (t.state === "DRAFT") redirect(`/asks/${params.id}/edit`);
  const ctx = { name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread };
  const title = t.answers.q1.split(/[.?!]/)[0]?.trim() || t.topic;
  const exit = isExit(t.state as AskState) || t.handMatching || (t.state === "IN_TEAM_REVIEW" && t.reason === "R_THIN");
  if (exit) return <ExitView t={t} ctx={ctx} title={title} withdrawn={searchParams.withdrawn === "1"} withdraw={searchParams.withdraw === "1"} />;

  const mentor = t.mentor?.shortName ?? "your mentor";
  const c = t.connection;
  const booked = t.state === "SCHEDULED" && !!c?.scheduledAt;
  const picking = t.state === "MENTOR_STEPPED_FORWARD" || t.state === "CONNECTION_APPROVED";
  const waitingGuardian = picking && c?.scheduledAt && !c.guardianTimeApprovedAt && t.minor;
  // After a missed call (or a change), there is nothing to pick until the mentor offers new times.
  const missed = picking && c?.status === "MISSED";
  const waitingTimes = t.state === "CONNECTION_APPROVED" && !!c && !c.scheduledAt && c.offered.length === 0;
  const rebooking = !!c && c.rescheduleCount > 0;
  const joinOpen = booked && c!.scheduledAt!.getTime() - Date.now() < 10 * 60_000;
  const g = t.guardianName ?? "your guardian";
  const outlook = booked ? `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Village Circle: ${t.topic}`)}&startdt=${c!.scheduledAt!.toISOString()}&enddt=${new Date(c!.scheduledAt!.getTime() + c!.minutes * 60_000).toISOString()}&body=${encodeURIComponent("Join from My Asks.")}` : "";

  const hero = booked ? (
    <section className="flex flex-col gap-3 rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[32px] lg:px-7 lg:py-[26px]">
      <p className="text-[12.5px] font-extrabold tracking-[.06em] opacity-85">YOUR CONVERSATION</p>
      <h2 className="font-display text-[30px] font-extrabold leading-[1.04] tracking-[-.02em] lg:text-[36px]">{f(c!.scheduledAt!, { weekday: "long", day: "numeric", month: "long" })},<br />{f(c!.scheduledAt!, { hour: "numeric", minute: "2-digit", hour12: true })}{tz && <>&nbsp;{tz}</>}</h2>
      <p className="text-[16px]">{c!.minutes} minutes on video with {mentor}.{t.minor && t.minorsGuardianAttends ? " Your guardian will attend." : ""}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2.5">
        <Link href={`/asks/${params.id}/call`} className={cn("dc-btn dc-btn-primary h-[52px]", !joinOpen && "opacity-[.42]")} aria-disabled={!joinOpen}><Icon name="video" size={18} />{joinOpen ? "Join conversation" : "Before the call"}</Link>
        <span className="text-[14px] font-bold">Add to calendar</span>
        {t.calendarUrl && <a href={t.calendarUrl} target="_blank" rel="noreferrer" className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Google</a>}
        <a href={outlook} target="_blank" rel="noreferrer" className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Outlook</a>
        <a href={`/asks/${params.id}/ics`} className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Download .ics</a>
      </div>
      <p className="text-[13.5px] leading-[1.45] opacity-85">The link opens 10 minutes before. We remind you 24 hours and 1 hour before. This conversation is recorded, and you and {mentor} are told first.</p>
    </section>
  ) : missed || waitingTimes ? (
    <section className="rounded-[28px] bg-blush p-5 text-blush-ink">
      <span className="rounded-full border-[1.5px] border-current px-3 py-1.5 text-[12.5px] font-bold">{missed ? "Missed call" : "Waiting"}</span>
      <h2 className="mt-3 font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[30px]">{missed ? "The conversation did not happen" : `Waiting for new times from ${mentor}`}</h2>
      <p className="mt-1.5 text-[14.5px] leading-normal">{missed ? "Nobody is blamed. You can rebook, or ask the team to find someone else." : `We asked ${mentor} to offer new times. We will tell you as soon as they arrive${t.minor ? `, and ${g} approves the one you pick` : ""}.`}</p>
      {missed && <Link href={`/asks/${params.id}/missed`} className="dc-btn dc-btn-primary mt-4 h-[50px]"><Icon name="calendar" size={18} />Rebook the conversation</Link>}
    </section>
  ) : picking ? (
    <section className="rounded-[28px] bg-butter p-5 text-butter-ink">
      <span className="rounded-full border-[1.5px] border-current px-3 py-1.5 text-[12.5px] font-bold">{waitingGuardian ? "Waiting" : "Good news"}</span>
      <h2 className="mt-3 font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[30px]">{waitingGuardian ? `Waiting for ${g} to approve the time` : rebooking ? `New times from ${mentor}` : `${mentor} stepped forward!`}</h2>
      <p className="mt-1.5 text-[14.5px] leading-normal">{waitingGuardian ? `You picked ${whenLong(c!.scheduledAt!)}. Nothing is booked until ${g} says yes.` : `${title}? Pick a time${t.minor ? ` and ${g} will approve it` : ""}.`}</p>
      {!waitingGuardian && t.state === "CONNECTION_APPROVED" && <Link href={`/asks/${params.id}/time`} className="dc-btn dc-btn-primary mt-4 h-[50px]"><Icon name="calendar" size={18} />Pick a time</Link>}
      {t.state === "MENTOR_STEPPED_FORWARD" && <p className="mt-3 text-[13.5px] opacity-85">{t.minor ? `${g} approves the match first, then you can pick a time.` : "The team confirms the match, then you can pick a time."}</p>}
    </section>
  ) : (
    <section className="rounded-[28px] bg-mint p-5 text-mint-ink">
      <h2 className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">{t.state === "AWAITING_GUARDIAN" ? `Waiting for ${g}` : t.state === "OPEN_TO_MENTORS" ? "Mentors can see your Ask" : t.state === "HELD" || t.state === "COMPLETE" ? "Your conversation happened" : "The team is reading your Ask"}</h2>
      <p className="mt-1.5 text-[15px] leading-normal">{t.state === "AWAITING_GUARDIAN" ? `${g[0]!.toUpperCase()}${g.slice(1)} has your Ask. Nothing moves until they answer.` : t.state === "OPEN_TO_MENTORS" ? "We will tell you as soon as someone steps forward. Usually 2 to 5 days." : t.state === "HELD" || t.state === "COMPLETE" ? "Say thanks, look at your notes, or ask for a follow-up." : "A real person reads every Ask, usually within 2 working days."}</p>
      {(t.state === "HELD" || t.state === "COMPLETE") && (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link href={`/asks/${params.id}/after`} className="dc-btn dc-btn-primary h-[50px]">After the call</Link>
          <Link href={`/asks/${params.id}/thanks`} className="dc-btn dc-btn-soft h-[50px] bg-card"><Icon name="heart" size={18} />Say thanks</Link>
          <Link href="/give-back" className="inline-flex h-[50px] items-center px-2 text-[14.5px] font-bold underline">Give back</Link>
        </div>
      )}
    </section>
  );

  const aside = (
    <>
      {t.mentor && (
        <Card className="flex flex-col gap-3 p-[18px]">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{t.mentor.shortName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
            <div><p className="text-[16px] font-bold">{t.mentor.shortName}</p><p className="text-[13px] text-stone">{t.mentor.headline}</p></div>
          </div>
          {t.mentor.expertise.length > 0 && <p className="text-[13.5px] text-bark">{t.mentor.expertise.join(", ")}</p>}
          <p className="text-[13.5px] text-bark">{[t.mentor.country, t.mentor.languages.join(", "), t.mentor.hoursLine].filter(Boolean).join(". ")}.</p>
          {t.mentor.verifiedLine && <div className="flex flex-wrap gap-1.5">{t.mentor.verifiedLine.split(" · ").map((v) => <span key={v} className="inline-flex items-center gap-1 rounded-full bg-mint px-[11px] py-1.5 text-[12px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={14} />{v.replace("cleared for minors", "Cleared for minors")}</span>)}</div>}
          <p className="text-[12.5px] leading-[1.4] text-stone">Contact details are never shared in either direction. Everything stays here, and private contact outside the platform is not allowed.</p>
          <Link href={`/asks/${params.id}/thread`} className="dc-btn dc-btn-soft h-11"><Icon name="message" size={18} />Messages</Link>
        </Card>
      )}
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your Ask</h2>
        <p className="text-[14.5px] italic leading-normal text-bark">&ldquo;{t.answers.q1}&rdquo;</p>
        <p className="text-[12.5px] leading-[1.4] text-stone">{t.mentor ? t.mentor.shortName : "A mentor"} sees your topic, question, what would help, {t.minor ? "your age band " : ""}and session length. Not your name or school.</p>
      </Card>
      {t.notes.length > 0 && (
        <Card className="p-[18px]">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Messages sent</h2>
          <ul className="mt-2.5 flex flex-col gap-2">{t.notes.map((n) => <li key={n.title + n.at.toISOString()} className="text-[13.5px]"><b>{n.title}</b><p className="text-stone">{f(n.at, { day: "numeric", month: "short" })}</p></li>)}</ul>
        </Card>
      )}
      <section className="flex flex-col gap-2.5 rounded-card bg-blush p-[18px] text-blush-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Report a concern</h2>
        <p className="text-[13.5px] leading-normal">One tap. It pauses the connection and goes straight to our safeguarding lead.</p>
        <Link href={`/report?ask=${params.id}`} className="inline-flex items-center gap-1.5 self-start rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="flag" size={16} />Report a concern</Link>
      </section>
    </>
  );

  return (
    <ParticipantShell ctx={ctx} aside={aside} phone={{ back: "/asks", title: "Your Ask" }}>
      <Link href="/asks" className="dc-btn dc-btn-soft h-10 self-start px-4 text-[14.5px] max-lg:hidden"><Icon name="chevronLeft" size={18} />All my Asks</Link>
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[36px]">{title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">{t.topic}</span>
          <span className="rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">{t.answers.sessionLength} minutes</span>
          {t.state in ASK_TAG && <AskTag state={t.state as AskTagKey} />}
        </div>
      </div>
      {searchParams.changed === "reschedule" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Done. The team will offer new times{t.minor ? ", and your guardian approves the new one" : ""}.</p>}
      {searchParams.rebook === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Done. We have asked for new times and will tell you when they arrive.</p>}
      {searchParams.followup === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Follow-up requested. The team will be in touch.</p>}
      {searchParams.thanked === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Thank you. The team reads it first, then your mentor sees it.</p>}
      {searchParams.picked === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">{t.minor ? `Time sent to ${g} to approve.` : "Booked. We sent you the details."}</p>}
      {hero}
      <Card className="p-5 lg:p-6">
        <h2 className="mb-[18px] font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Where things are</h2>
        <Journey j={t} full />
      </Card>
      {booked && c && c.offered.length > 1 && (
        <Card className="flex flex-col gap-3 p-5 lg:p-[22px]">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Your time</h2>
          <p className="text-[14.5px] text-bark">Need to change it? {t.minor ? `${g[0]!.toUpperCase()}${g.slice(1)} approves any change.` : "Ask for a different time."}</p>
          {c.offered.map((o) => {
            const chosen = c.scheduledAt && o.getTime() === c.scheduledAt.getTime();
            return (
              <div key={o.toISOString()} className={cn("flex items-center gap-3 rounded-field border-2 p-3.5", chosen ? "border-forest bg-mint/40" : "border-line")}>
                <Icon name={chosen ? "check" : "clock"} size={20} className={chosen ? "text-forest" : "text-stone"} />
                <div><p className="text-[15px] font-bold">{whenLong(o)} {tz}</p><p className="text-[13px] text-stone">{chosen ? (t.minor ? "Chosen. Approved by your guardian." : "Chosen.") : `Other time ${mentor} offered.`}</p></div>
              </div>
            );
          })}
          <Link href={`/asks/${params.id}/reschedule`} className="dc-btn dc-btn-ghost h-[46px] self-start">Change the time</Link>
        </Card>
      )}
      {!["HELD", "COMPLETE"].includes(t.state) && <WithdrawInline askId={params.id} booked={booked} />}
    </ParticipantShell>
  );
}
