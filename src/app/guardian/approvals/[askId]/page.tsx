import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { guardianApprovalView } from "@/lib/call-extra";
import { APP_TZ } from "@/lib/domain/scheduling";
import { AskDecision } from "../../forms";
import { ApproveForm } from "./approve-form";
import { cn } from "@/lib/cn";

export const metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

const when = (d: Date) => `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long" }).format(d)}, ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;
const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short" }).format(d);

function Step({ n, title, state, children, active }: { n: number; title: string; state: "done" | "now" | "wait"; children?: React.ReactNode; active?: boolean }) {
  const tag = state === "done" ? ["Done", "bg-mint text-mint-ink"] : state === "now" ? ["Needs you", "bg-butter text-butter-ink"] : ["Waiting", "bg-sand text-ink"];
  return (
    <section className={cn("rounded-card bg-card p-5", active ? "border-2 border-clay" : "border border-line")}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-[34px] shrink-0 items-center justify-center rounded-full font-display text-[16px] font-extrabold", state === "done" ? "bg-forest text-forest-ink" : state === "now" ? "bg-clay text-clay-ink" : "bg-sand text-stone")}>{state === "done" ? <Icon name="check" size={18} strokeWidth={3} /> : n}</span>
        <h2 className="min-w-0 flex-1 font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{title}</h2>
        <span className={cn("whitespace-nowrap rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", tag[1])}>{tag[0]}</span>
      </div>
      {children && <div className="mt-3.5">{children}</div>}
    </section>
  );
}

/** G2 Approve the Ask, then the mentor and the time. Each step is its own yes. */
export default async function Approval({ params }: { params: { askId: string } }) {
  const r = await guardianPage(`/guardian/approvals/${params.askId}`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const v = await guardianApprovalView(c.userId, params.askId);
  if (!v) redirect("/guardian/approvals");
  const f = v.participantFirst;
  const m = v.mentor;
  const conn = v.connection;
  const askDone = v.state !== "AWAITING_GUARDIAN";
  const pending = v.state === "CONNECTION_APPROVED" && conn?.status === "AWAITING_GUARDIAN" && !!m;
  const booked = !!conn?.guardianTimeApprovedAt;
  const times = (conn?.offered.length ? conn.offered : conn?.scheduledAt ? [conn.scheduledAt] : []).map((t) => ({ iso: t.toISOString(), label: `${when(t)}${APP_TZ() === "Africa/Lagos" ? " WAT" : ""}` }));

  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What {m?.first ?? "the mentor"} sees</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px]">{["A short summary written by the team", `${f}'s first name`, "Their age band, 15 to 17"].map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-forest" />{x}</li>)}</ul>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What {m?.first ?? "the mentor"} never sees</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px]">{["Their last name or school", "Phone, email or social handles", "Your contact details"].map((x) => <li key={x} className="flex gap-2"><Icon name="x" size={16} className="mt-0.5 shrink-0 text-clay" />{x}</li>)}</ul>
      </Card>
      <p className="text-[13px] leading-normal text-stone">The team reads every Ask before a mentor sees it. You can pause anything at any time.</p>
    </>
  );

  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} aside={aside} tabs={!pending} phone={{ back: "/guardian/approvals", title: "Approvals" }}>
      <div className="max-lg:hidden">
        <h1 className="font-display text-[34px] font-extrabold leading-[1.12] tracking-[-.01em]">Approve {f}&apos;s Ask, then the mentor and the time</h1>
        <p className="mt-1 text-[16px] text-bark">You decide at each step. Nothing moves until you answer.</p>
      </div>
      <p className="text-[15px] leading-normal text-bark lg:hidden">You decide at each step. Nothing moves until you answer.</p>
      {v.paused && <p role="alert" className="rounded-[18px] bg-blush px-4 py-3 text-[15px] font-semibold text-blush-ink">This connection is paused. A team member will be in touch.</p>}

      <Step n={1} title="Authorize the Ask" state={askDone ? "done" : "now"} active={!askDone}>
        {askDone && v.authorizedAt && <p className="-mt-1.5 mb-3 text-[13px] text-stone">Done {day(v.authorizedAt)}</p>}
        <blockquote className="rounded-[18px] bg-sand px-4 py-3.5 text-[15.5px] leading-normal">&ldquo;{v.answers.q1}&rdquo;</blockquote>
        {(v.answers.q2 || v.answers.q3) && <p className="mt-2.5 text-[14px] leading-normal text-bark">{[v.answers.q2, v.answers.q3].filter(Boolean).join(" ")}</p>}
        <p className="mt-2.5 text-[13.5px] leading-normal text-stone">You see {f}&apos;s full words. Mentors only see a short summary prepared by our team.</p>
        {!askDone && <div className="mt-3.5"><AskDecision askId={v.askId} first={f} /></div>}
      </Step>

      <Step n={2} title="Approve the mentor" state={booked || (askDone && conn?.guardianMentorApprovedAt) ? "done" : pending ? "now" : "wait"} active={pending}>
        {m ? (
          <>
            <div className="flex items-center gap-3.5">
              <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-mint font-display text-[19px] font-bold text-mint-ink">{m.card.shortName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div><p className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{m.card.shortName}</p><p className="text-[14px] text-bark">{[m.card.headline, m.card.expertise.slice(1, 2).join("")].filter(Boolean).join(". ")}.</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.verified && <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-[13px] py-[7px] text-[13.5px] font-semibold text-mint-ink"><Icon name="check" size={16} />Verified</span>}
              {m.cleared && <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-[13px] py-[7px] text-[13.5px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={16} />Cleared for young adults</span>}
              {m.oriented && <span className="rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">Safeguarding orientation done</span>}
            </div>
            <p className="mt-3 text-[14px] leading-normal text-bark">{m.first} is not given {f}&apos;s name, school or contact details. You see their profile, but no contact details either.</p>
          </>
        ) : <p className="text-[14.5px] text-bark">When a mentor steps forward and the team confirms the match, they appear here for you to approve.</p>}
      </Step>

      <Step n={3} title="Approve a time" state={booked ? "done" : pending ? "now" : "wait"} active={false}>
        {booked && conn?.scheduledAt ? <p className="text-[15px]"><b>Booked for {when(conn.scheduledAt)}.</b> {v.guardianAttends ? "You will attend." : "You will be reachable."} <Link href={`/guardian/asks/${v.askId}/call`} className="font-bold text-clay">Before you join</Link></p>
          : pending && m ? <ApproveForm askId={v.askId} mentor={m.card.shortName} times={times} selected={conn?.scheduledAt?.toISOString()} attends={v.guardianAttends} first={f} />
          : <p className="text-[14.5px] text-bark">{f} picks from the times the mentor offers. Then the time comes to you.</p>}
      </Step>
      {pending && <p className="text-[13.5px] leading-normal text-stone">Declining does not cancel the Ask. The team will suggest someone else.</p>}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </GuardianShell>
  );
}
