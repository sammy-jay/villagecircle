import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card, DateTile, PASTEL, type Pastel } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { guardianOverview } from "@/lib/safety-user";
import { APP_TZ } from "@/lib/domain/scheduling";
import { attendanceAction } from "./actions";
import { AskDecision } from "./forms";
import { cn } from "@/lib/cn";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const ago = (d: Date) => { const h = Math.floor((Date.now() - d.getTime()) / 3600_000); return h < 1 ? "Just now" : h < 24 ? `${h} hour${h === 1 ? "" : "s"} ago` : f(d, { day: "numeric", month: "short" }); };
const greeting = () => { const h = Number(f(new Date(), { hour: "numeric", hourCycle: "h23" })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

/** G1 Overview: the young person, what is waiting on the guardian, the next call and recent activity. */
export default async function GuardianHome() {
  const r = await guardianPage("/guardian");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const o = await guardianOverview(c.userId);
  const shell = { name: c.name, of: c.kids.join(" and ") || undefined, approvals: c.needs, unread: c.unread };
  if (!o) {
    return (
      <GuardianShell {...shell} phone={{ title: "Overview" }}>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[42px]">{greeting()}, {c.first}</h1>
        <Card className="p-6 text-[15px] text-bark">No young person is linked to your account yet. When you authorize one from the email we sent, they appear here.</Card>
      </GuardianShell>
    );
  }
  const endsOn = o.endsOn ? f(o.endsOn, { day: "numeric", month: "long", year: "numeric" }) : null;
  const statusTag = o.status === "ACTIVE" ? ["Account active", "mint"] : o.status === "PAUSED" ? ["Paused", "butter"] : o.status === "SUSPENDED" ? ["Consent withdrawn", "blush"] : [o.status.toLowerCase(), "butter"];
  const actIcon: IconName[] = ["inbox", "check", "users", "shieldCheck"];

  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">What you&apos;re authorizing</h2>
        <dl className="mt-2 divide-y divide-line text-[14.5px]">
          {[["Length", "30 to 60 minutes"], ["Mentors", "Verified, cleared for young adults"], ["Contact details", "Never shared"], ["Recording", "On, available to you"]].map(([k, v]) => <div key={k} className="flex justify-between gap-3.5 py-[11px]"><dt className="text-stone">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Family settings</h2>
        <p className="mt-2 text-[13.5px] text-stone">Attendance preference</p>
        <p className="mt-0.5 text-[15.5px] font-bold">{o.pref}.</p>
        <Link href="/guardian/authorizations" className="dc-btn dc-btn-ghost mt-2.5 h-[42px]">Change settings</Link>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Withdraw consent</h2>
        <p className="mt-1.5 text-[14px] leading-normal text-bark">Withdrawing consent pauses {o.first}&apos;s account and any open Asks straight away. Nothing is deleted.</p>
        <Link href="/guardian/withdraw" className="mt-3 inline-block text-[14.5px] font-bold text-clay">Learn what happens</Link>
      </Card>
    </>
  );

  return (
    <GuardianShell {...shell} aside={aside} phone={{ title: `Hello, ${c.first}` }}>
      <div className="max-lg:hidden">
        <h1 className="font-display text-[42px] font-extrabold leading-[1.12] tracking-[-.01em]">{greeting()}, {c.first}</h1>
        <p className="mt-1 text-[16.5px] leading-normal text-bark">Everything {o.first} is doing in the village, and everything waiting on you.</p>
      </div>
      <p className="text-[12.5px] font-extrabold tracking-[.05em] text-clay lg:hidden">GUARDIAN VIEW</p>
      <h1 className="sr-only lg:hidden">Overview</h1>
      <Card className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-[linear-gradient(135deg,rgb(var(--clay)),#C99A2E)] p-[3px]"><span className="block rounded-full bg-paper p-[3px]"><span className="flex size-16 items-center justify-center rounded-full bg-blush font-display text-[23px] font-bold text-blush-ink">{o.initials}</span></span></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5"><p className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-.01em]">{o.short}</p><span className={cn("inline-flex items-center gap-1.5 rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", PASTEL[statusTag[1] as Pastel].both)}><Icon name="check" size={16} />{statusTag[0]}</span></div>
            <p className="mt-1 text-[14px] leading-normal text-bark">{o.age != null ? `Age ${o.age}. ` : ""}{endsOn ? `Your authority ends on their 18th birthday, ${endsOn}.` : ""}</p>
          </div>
        </div>
        <Link href="/report" className="dc-btn dc-btn-ghost h-11 shrink-0 lg:ml-auto"><Icon name="flag" size={18} />Raise a concern</Link>
      </Card>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Waiting on you</h2><span className="text-[13.5px] font-bold text-clay">{o.waiting.length ? `${o.waiting.length} ${o.waiting.length === 1 ? "thing" : "things"}` : "Nothing right now"}</span></div>
        {o.waiting.length === 0 && <Card className="p-5 text-[15px] text-bark">You are all caught up. We will email and text you when {o.first} needs a yes.</Card>}
        {o.waiting.map((w) => {
          const tone = w.kind === "ASK" ? "butter" : "blush";
          const exp = w.submittedAt ? Math.max(0, 14 - Math.floor((Date.now() - w.submittedAt.getTime()) / 86400_000)) : null;
          return (
            <section key={w.id} className={cn("flex flex-col gap-3 rounded-[26px] px-[22px] py-5", PASTEL[tone].both)}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-card"><Icon name={w.kind === "ASK" ? "message" : "users"} size={22} /></span>
                <p className="text-[12.5px] font-extrabold uppercase tracking-[.05em]">{w.kind === "ASK" ? "New Ask" : `${w.topic} Ask`}</p>
                {exp !== null && w.kind === "ASK" && <span className="ml-auto rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold text-ink">Expires in {exp} days</span>}
              </div>
              <h3 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">{w.title}</h3>
              {w.kind === "ASK" ? (
                <>
                  <p className="text-[15px] leading-normal">{w.topic}. {o.first}&apos;s full words are below. Mentors only see a short summary the team prepares.</p>
                  <blockquote className="rounded-[18px] bg-card px-4 py-3.5 text-[15.5px] leading-normal text-ink">&ldquo;{w.quote}&rdquo;</blockquote>
                  <AskDecision askId={w.id} first={o.first} review={`/guardian/approvals/${w.id}`} />
                </>
              ) : (
                <>
                  <p className="text-[15px] leading-normal">{w.mentor?.short}{w.mentor?.headline ? `, ${w.mentor.headline.toLowerCase()}` : ""}. {w.times?.[0]?.label}. Nothing is booked until you say yes.</p>
                  <Link href={`/guardian/approvals/${w.id}`} className="dc-btn dc-btn-forest h-[46px] self-start">Review mentor and time</Link>
                </>
              )}
            </section>
          );
        })}
      </section>

      {o.upcoming && (
        <section className="flex flex-col gap-3.5">
          <h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Coming up</h2>
          <Card className="p-[18px]">
            <div className="flex items-center gap-4">
              {(() => { const [wd, rest] = o.upcoming.short.split(" · ")[0]!.split(" ") as [string, string]; return <DateTile month={wd.toUpperCase()} day={rest ?? ""} tone="mint" />; })()}
              <div className="min-w-0 flex-1">
                <p className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">{o.upcoming.minutes} minutes with {o.upcoming.mentor} about {o.upcoming.topic}</p>
                <p className="mt-1 text-[14px] text-bark">{o.upcoming.when}. By video, in the app.</p>
                <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", o.upcoming.attends ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink")}><Icon name={o.upcoming.attends ? "users" : "bell"} size={16} />{o.upcoming.attends ? "You will attend" : "You will be reachable"}</span>
              </div>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-2">
              <form action={attendanceAction}><input type="hidden" name="askId" value={o.upcoming.askId} /><input type="hidden" name="attends" value={o.upcoming.attends ? "0" : "1"} /><button type="submit" className="text-[14px] font-bold text-clay">{o.upcoming.attends ? "Change to reachable, not present" : "Change to attend"}</button></form>
              <Link href={`/guardian/asks/${o.upcoming.askId}/call`} className="text-[14px] font-bold text-clay">Before you join</Link>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-bold">Add to calendar</span>
              <a href={o.upcoming.calendar} target="_blank" rel="noreferrer" className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Google</a>
              <a href={`/guardian/asks/${o.upcoming.askId}/ics`} className="rounded-full border-[1.5px] border-ink px-3.5 py-[7px] text-[14px] font-semibold">Download .ics</a>
            </div>
          </Card>
        </section>
      )}

      {o.activity.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Recent activity</h2>
          <Card className="px-5 py-0">
            <ul className="divide-y divide-line">
              {o.activity.map((a, i) => (
                <li key={a.text + i} className="flex items-center gap-3.5 py-3">
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", PASTEL[(["butter", "mint", "blush", "mint"] as const)[i % 4]].both)}><Icon name={actIcon[i % 4]!} size={22} /></span>
                  <p className="min-w-0 flex-1 text-[15px] font-bold">{a.text}</p>
                  <span className="whitespace-nowrap text-[12.5px] text-stone">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <div className="flex flex-col gap-4 lg:hidden">
        <Link href="/guardian/recordings" className="rounded-card border border-line bg-card p-5"><p className="font-display text-[19px] font-extrabold">{o.first}&apos;s recordings</p><p className="mt-1 text-[14px] text-bark">Calls {o.first} has had, with recordings only you can open.</p></Link>
        <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">Withdraw consent</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Withdrawing pauses {o.first}&apos;s account and any open Asks immediately. Your visibility ends on their 18th birthday, when the account becomes a standard adult account.</p><Link href="/guardian/withdraw" className="dc-btn dc-btn-ghost mt-3 h-11">Withdraw consent</Link></Card>
      </div>
    </GuardianShell>
  );
}
