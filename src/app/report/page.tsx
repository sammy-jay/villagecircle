import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { MENTOR_NAV } from "@/components/dc/nav-config";
import { AppShell, GuardianShell, ParticipantShell } from "@/components/app/app-shell";
import { settingsPage } from "@/lib/settings-ctx";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { ReportForm } from "./report-form";

export const metadata = { title: "Report a concern" };
export const dynamic = "force-dynamic";

const dm = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
const first = (n: string) => n.split(" ")[0] ?? n;
const short = (n: string) => { const [a, b] = n.split(" "); return b ? `${a} ${b[0]}.` : a ?? n; };

type AskRow = { id: string; updatedAt: Date; topic: { name: string }; connection: { scheduledAt: Date | null; mentor: { user: { name: string } } } | null; participant: { user: { name: string } } };
const include = { topic: true, connection: { include: { mentor: { include: { user: true } } } }, participant: { include: { user: true } } } as const;

/** Asks and calls this person could be reporting about, newest first. Labels never show more than a first name and initial. */
async function reportable(userId: string, role: "PARTICIPANT" | "MENTOR" | "GUARDIAN") {
  let rows: AskRow[] = [];
  if (role === "PARTICIPANT") {
    const p = await db.participantProfile.findUnique({ where: { userId } });
    if (p) rows = await db.ask.findMany({ where: { participantId: p.id }, include, orderBy: { updatedAt: "desc" }, take: 12 });
  } else if (role === "GUARDIAN") {
    const g = await db.guardian.findUnique({ where: { userId }, include: { links: { where: { active: true } } } });
    if (g) rows = await db.ask.findMany({ where: { participantId: { in: g.links.map((l) => l.participantId) } }, include, orderBy: { updatedAt: "desc" }, take: 12 });
  } else {
    rows = await db.ask.findMany({ where: { connection: { mentor: { userId } } }, include, orderBy: { updatedAt: "desc" }, take: 12 });
  }
  return rows.map((a) => {
    const other = role === "MENTOR" ? short(a.participant.user.name) : a.connection ? short(a.connection.mentor.user.name) : null;
    const when = a.connection?.scheduledAt ?? a.updatedAt;
    const who = role === "GUARDIAN" ? `${first(a.participant.user.name)}'s ` : "";
    return { id: a.id, label: other ? `${who}${a.topic.name} call with ${other}, ${dm(when)}` : `${who}${a.topic.name} Ask, ${dm(when)}` };
  });
}

const STEPS: [string, string, string][] = [
  ["The connection is paused", "Straight away, while we look.", "bg-butter text-butter-ink"],
  ["The safeguarding lead is told", "Only a few trained people can see your report.", "bg-mint text-mint-ink"],
  ["We reply within 48 hours", "We will never share it with the person involved.", "bg-blush text-blush-ink"],
];
function WhatNext({ phone }: { phone?: boolean }) {
  return (
    <section className={cn("rounded-card border border-line bg-card", phone ? "p-[18px]" : "p-5")}>
      <h2 className="font-display text-[19px] font-extrabold leading-[1.02] tracking-[-.02em]">What happens next</h2>
      <ol className={cn("flex flex-col", phone ? "mt-2.5 gap-2.5" : "mt-3.5 gap-3.5")}>
        {STEPS.map(([t, s, tone], i) => (
          <li key={t} className={cn("flex items-start", phone ? "gap-3.5" : "gap-3")}>
            <span className={cn("flex shrink-0 items-center justify-center font-display font-extrabold", tone, phone ? "size-[34px] rounded-tile text-[17px]" : "size-8 rounded-[10px] text-[16px]")}>{i + 1}</span>
            <div>
              <p className={cn("font-extrabold", phone ? "text-[16px]" : "text-[15px]")}>{t}</p>
              <p className={phone ? "mt-0.5 text-[14px] leading-[1.4] text-bark" : "mt-px text-[13.5px] text-stone"}>{s}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** M16 Report a concern. Open to participants, mentors and guardians, from anywhere; `?ask=` preselects the Ask. */
export default async function Report({ searchParams }: { searchParams: { ask?: string } }) {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/report" : r.to);
  const c = r.ctx;
  const asks = await reportable(c.userId, c.role);
  const askId = asks.some((a) => a.id === searchParams.ask) ? searchParams.ask : undefined;

  // A young person's guardian is only told if the team decides it keeps them safe.
  let guardianFirst: string | null = null;
  if (c.role === "PARTICIPANT" && c.minor) {
    const link = await db.guardianLink.findFirst({ where: { active: true, participant: { userId: c.userId } }, include: { guardian: { include: { user: true } } } });
    guardianFirst = link ? first(link.guardian.user.name) : "Your guardian";
  }
  const back = searchParams.ask ? `/asks/${searchParams.ask}` : "/settings";

  const aside = (
    <>
      <WhatNext />
      {guardianFirst && (
        <div className="flex gap-3 rounded-[22px] bg-mint px-[18px] py-[15px] text-[13.5px] leading-[1.45] text-mint-ink">
          <Icon name="shieldCheck" size={22} className="shrink-0" />
          <p><b>{guardianFirst} is not told</b> unless the team decides it keeps you safe, and we would tell you first.</p>
        </div>
      )}
      <section className="rounded-card bg-butter p-5 text-butter-ink">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.02] tracking-[-.02em]">Not an emergency service</h2>
        <p className="mt-2 text-[13.5px] leading-normal">A mentor cannot help with a crisis, and that is okay. Real help is a call away: 112 at any hour.</p>
      </section>
    </>
  );

  const body = (
    <>
      <Link href={back} className="dc-btn dc-btn-soft h-10 self-start px-4 text-[14.5px] max-lg:hidden"><Icon name="chevronLeft" size={18} />{searchParams.ask ? "Back to the Ask" : "Settings"}</Link>
      <h1 className="font-display text-[40px] font-extrabold leading-[1.02] tracking-[-.02em] max-lg:hidden">Report a concern</h1>
      <p className="text-[15.5px] leading-normal text-bark lg:text-[16px]">
        You can do this from any Ask or conversation. You will not get in trouble for <span className="lg:hidden">speaking up.</span>
        <span className="max-lg:hidden">telling us. The team reads every report and never shares it with the person involved.</span>
      </p>
      <div className="flex gap-3 rounded-[22px] bg-blush px-4 py-3.5 text-[14px] leading-[1.45] text-blush-ink lg:gap-3.5 lg:rounded-card lg:px-5 lg:py-[18px] lg:text-[15px] lg:leading-normal">
        <Icon name="heart" size={24} className="shrink-0" />
        <div>
          <p className="lg:hidden"><b>In danger right now?</b> Call 112, or get support straight away.</p>
          <p className="mb-[3px] font-display text-[19px] font-extrabold max-lg:hidden">In danger right now?</p>
          <p className="max-lg:hidden">Call <b>112</b> for the police or an ambulance in Nigeria. Outside Nigeria, call 988 in the US or your local emergency number. Then get support here straight away.</p>
          <Link href="/crisis" className="mt-2 inline-block font-extrabold underline lg:hidden">Get support now</Link>
          <Link href="/crisis" className="mt-2.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold max-lg:hidden"><Icon name="phone" size={16} />Get support now</Link>
        </div>
      </div>
      <ReportForm asks={asks} askId={askId} back={back} after={<WhatNext phone />} />
    </>
  );

  const phone = { back, title: "Report a concern" };
  if (c.role === "PARTICIPANT") return <ParticipantShell ctx={{ name: c.name, openCount: c.openCount, unread: c.unread }} aside={aside} phone={phone}>{body}</ParticipantShell>;
  if (c.role === "GUARDIAN") return <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} phone={phone}>{body}</GuardianShell>;
  return <AppShell nav={MENTOR_NAV} user={{ name: c.name, roleLabel: "Mentor", tone: "mint" }} unread={c.unread} aside={aside} phone={phone}>{body}</AppShell>;
}
