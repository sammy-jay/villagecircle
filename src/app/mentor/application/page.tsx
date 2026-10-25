import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { initials } from "@/components/dc";
import { db } from "@/lib/db";
import { mentorHome, mentorPage } from "@/lib/mentor-ctx";
import { APPEAL_KINDS, infoRequest, statusFor } from "@/lib/mentor";
import { APP_TZ } from "@/lib/domain/scheduling";
import { firstName } from "@/lib/domain/views";
import { cn } from "@/lib/cn";
import { JoinShell, Label, NextSteps } from "../mentor-kit";
import { Appeal, InfoReply } from "./forms";

export const metadata = { title: "Your application" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "long" }).format(d);
const BARS = ["Sent", "In review", "Orientation", "Active"];

/** M14 / DK11 application status, and EX10 when the application was declined (with one appeal). */
export default async function Application({ searchParams }: { searchParams: { sent?: string } }) {
  const r = await mentorPage("/mentor/application", "any");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  if (c.gate === "APPLY") redirect(mentorHome("APPLY"));
  const st = await statusFor(c.userId);
  if (!st) redirect("/mentor/apply");
  const { app } = st;
  const reviewer = app.decidedById ? await db.user.findUnique({ where: { id: app.decidedById }, select: { name: true } }) : null;
  const who = reviewer ? firstName(reviewer.name) : "the team";
  const info = infoRequest(app);
  const appeal = (app.payload as { appeal?: { kind: string; at: string } } | null)?.appeal ?? null;

  if (app.state === "DECLINED" || app.state === "WITHDRAWN") {
    const canAppeal = app.state === "DECLINED" && !appeal && app.decision !== "V-ATTEST";
    const reopen = app.decidedAt ? new Date(app.decidedAt.getTime() + 182 * 86400_000) : null;
    return (
      <JoinShell name={c.short} role="Mentor applicant" title="Your application" aside={<Aside steps="declined" reopen={reopen} />}>
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[40px]">{app.state === "WITHDRAWN" ? "Your application was withdrawn" : "Your application was not approved"}</h1>
          <p className="mt-2 text-[16px] text-bark lg:text-[17px]">Thank you for offering your time. This is a decision about fit and readiness, not about you as a person.</p>
        </div>
        {app.decisionNote && (
          <section className="rounded-card border border-line bg-card p-5 lg:p-6">
            <Label>The reason we gave</Label>
            <p className="mt-2 text-[17px] font-extrabold">{app.decision === "V-ATTEST" ? "The safeguarding statement was not signed" : app.decisionNote}</p>
            {app.decision !== "V-ATTEST" && <p className="mt-1 text-[14.5px] text-bark">We would be glad to hear from you again in six months.</p>}
            {app.decidedAt && <p className="mt-2 text-[13px] text-stone">Reviewed by a team member, {day(app.decidedAt)}.</p>}
          </section>
        )}
        {canAppeal ? (
          <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
            <div><h2 className="font-display text-[21px] font-extrabold">Ask us to look again</h2><p className="mt-1 text-[14.5px] text-bark">One appeal is allowed. A different reviewer reads it.</p></div>
            <Appeal kinds={APPEAL_KINDS} />
          </section>
        ) : appeal ? <p className="rounded-card bg-mint p-5 text-[15px] text-mint-ink">You appealed on {day(new Date(appeal.at))}. A different reviewer is reading it.</p> : null}
        <p className="flex items-start gap-3 text-[13.5px] text-stone"><Icon name="lock" size={18} className="mt-px shrink-0" />Your attestation and details are kept securely and are never shared. You can ask us to delete them from <Link href="/settings/data" className="font-bold text-clay">your data settings</Link>.</p>
        <div className="flex flex-col gap-4 lg:hidden"><Aside steps="declined" reopen={reopen} /></div>
      </JoinShell>
    );
  }

  const approved = app.state === "APPROVED";
  const at = approved ? 2 : 1;
  return (
    <JoinShell name={c.short} title="Your application" aside={<Aside steps="review" current={approved ? 1 : 0} />}>
      {searchParams.sent === "1" && !approved && <p role="status" className="flex items-center gap-2.5 rounded-[18px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />Sent. Thank you, {c.first}. We have emailed you a copy.</p>}
      <section className="rounded-[28px] bg-butter p-6 text-butter-ink lg:px-8 lg:py-8">
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.07em]">Your invitation to the village</p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[40px]">{approved ? `Welcome, ${c.first}.` : `Hi ${c.first}, a person on our team is reading yours.`}</h1>
        <p className="mt-3 max-w-[560px] text-[15.5px] leading-normal">{approved ? "Your application is approved. Two short things remain before your first conversation." : "Here is where things stand. We read every sign-up ourselves, and we reply within 5 business days."}</p>
        <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Progress">
          {BARS.map((b, i) => (
            <li key={b} aria-current={i === at ? "step" : undefined}>
              <span className={cn("block h-2 rounded", i < at ? "bg-forest" : i === at ? "bg-clay" : "bg-card/70")} />
              <span className={cn("mt-2 block text-[12.5px] lg:text-[13.5px]", i === at ? "font-extrabold" : "font-semibold")}>{b}</span>
            </li>
          ))}
        </ol>
      </section>

      {approved ? (
        <section className="rounded-card bg-mint p-5 text-mint-ink lg:p-6">
          <p className="flex items-center gap-1.5 text-[14px] font-bold"><Icon name="check" size={16} />Approved</p>
          <h2 className="mt-2 font-display text-[24px] font-extrabold">Welcome, {c.first}.</h2>
          <p className="mt-1 text-[15px] leading-normal">Two short things remain before your first conversation: the Code of Conduct and safeguarding orientation.</p>
          <Link href={c.gate === "ACTIVE" ? "/mentor" : "/mentor/orientation"} className="dc-btn dc-btn-primary mt-4 h-[52px]"><Icon name="arrowRight" size={18} />{c.gate === "ACTIVE" ? "Go to my inbox" : "Finish setting up"}</Link>
        </section>
      ) : info.open ? (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-blush px-3 py-1.5 text-[13px] font-semibold text-blush-ink"><Icon name="info" size={15} />More information requested</span>
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink" aria-hidden="true">{initials(reviewer?.name ?? "Team")}</span>
            <div><p className="text-[15px] font-extrabold">{reviewer ? `${who}, from the team` : "The team"}</p><p className="mt-0.5 text-[15px] leading-normal text-bark">{info.question}</p></div>
          </div>
          <InfoReply reviewer={who} />
        </section>
      ) : (
        <section className="rounded-card border border-line bg-card p-5 lg:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1.5 text-[13px] font-semibold text-butter-ink"><Icon name="clock" size={15} />{app.state === "APPEALED" ? "Appeal in review" : "In review"}</span>
          <p className="mt-3 text-[15.5px] leading-normal">
            {app.state === "APPEALED" ? "A different reviewer is reading your appeal. We reply within 5 business days." : `Sent ${app.submittedAt ? day(app.submittedAt) : "recently"}. We reply within 5 business days${st.dueBy ? `, by ${day(st.dueBy)}` : ""}. You do not need to do anything.`}
          </p>
          {info.replies.length > 0 && <p className="mt-2 text-[14px] text-stone">Your reply was sent {day(new Date(info.replies[info.replies.length - 1]!.at))}.</p>}
        </section>
      )}
      <div className="flex flex-col gap-4 lg:hidden"><Aside steps="review" current={approved ? 1 : 0} /></div>
    </JoinShell>
  );
}

function Aside({ steps, current = 0, reopen }: { steps: "review" | "declined"; current?: number; reopen?: Date | null }) {
  if (steps === "declined") return (
    <section className="rounded-card border border-line bg-card p-5">
      <h2 className="font-display text-[19px] font-extrabold">What happens next</h2>
      <ol className="mt-3 flex flex-col gap-3 text-[14px]">
        <li><b className="block">Decision shared</b><span className="text-stone">You can see your record</span></li>
        <li><b className="block">Appeal (optional)</b><span className="text-stone">A second reviewer reads it</span></li>
        <li><b className="block">Reapply</b><span className="text-stone">{reopen ? `Opens again from ${day(reopen)}` : "Opens again after six months"}</span></li>
      </ol>
    </section>
  );
  return (
    <>
      <section className="rounded-card border border-line bg-card p-5"><h2 className="font-display text-[19px] font-extrabold">What happens next</h2><NextSteps current={current} /></section>
      <p className="flex gap-3 rounded-card bg-mint p-5 text-[14px] leading-normal text-mint-ink"><Icon name="mail" size={20} className="mt-px shrink-0" />You do not need to do anything while we read. We will email you.</p>
    </>
  );
}
