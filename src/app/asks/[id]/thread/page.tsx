import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { threadView } from "@/lib/ask-thread";
import { APP_TZ } from "@/lib/domain/scheduling";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { Composer } from "./composer";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const dayKey = (d: Date) => f(d, { year: "numeric", month: "2-digit", day: "2-digit" });
const stamp = (d: Date) => `${f(d, { weekday: "short" })} ${f(d, { hour: "numeric", minute: "2-digit", hour12: true })}`;
const initialsOf = (n: string) => n.replace(/^Dr\s+/, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** N08 Ask thread between the young person and their mentor. */
export default async function Thread({ params }: { params: { id: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/thread` : r.to);
  const t = await threadView(r.ctx.userId, params.id);
  if (!t) redirect(`/asks/${params.id}`);
  const m = t.mentor;
  const guardian = r.ctx.minor ? await db.guardianLink.findFirst({ where: { active: true, participant: { userId: r.ctx.userId } }, include: { guardian: { include: { user: true } } } }) : null;
  const gName = guardian?.guardian.user.name.split(" ")[0] ?? "your guardian";
  const today = dayKey(new Date());

  const items: React.ReactNode[] = [];
  let last = "";
  const sys = (key: string, text: string) => <p key={key} className="self-center rounded-full bg-sand px-3.5 py-1.5 text-center text-[12.5px] font-semibold text-bark">{text}</p>;
  const sep = (key: string, d: Date) => <p key={key} className="self-center text-[12px] font-extrabold tracking-[.06em] text-stone">{dayKey(d) === today ? "TODAY" : f(d, { weekday: "long", day: "numeric", month: "short" }).toUpperCase()}</p>;
  items.push(sep("d0", t.matchedAt)); last = dayKey(t.matchedAt);
  items.push(sys("match", `${m.short} stepped forward.${t.guardianApproved ? ` ${r.ctx.minor ? "Your guardian" : "The team"} approved the match.` : ""}`));
  for (const x of t.messages) {
    if (dayKey(x.at) !== last) { items.push(sep(`d-${x.id}`, x.at)); last = dayKey(x.at); }
    items.push(
      <div key={x.id} className={cn("flex max-w-[85%] flex-col gap-1 lg:max-w-[75%]", x.mine ? "items-end self-end" : "items-start self-start")}>
        <p className={cn("whitespace-pre-wrap rounded-[22px] px-4 py-3 text-[15px] leading-normal", x.mine ? "rounded-br-md bg-forest text-forest-ink" : x.role === "TEAM" ? "bg-butter text-butter-ink" : "rounded-bl-md border border-line bg-card")}>{x.body}</p>
        <span className="px-1 text-[12px] text-stone">{stamp(x.at)}</span>
      </div>,
    );
  }

  const stay = (
    <div className="flex gap-3 rounded-[20px] bg-butter px-4 py-3.5 text-[13.5px] leading-[1.45] text-butter-ink">
      <Icon name="shieldCheck" size={22} className="shrink-0" />
      <p><b>Stay on the platform.</b> Keep every message and call here. Never share phone numbers, social handles or addresses, and never move to WhatsApp. The team can read this chat to keep you safe.</p>
    </div>
  );
  const aside = (
    <>
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">About {m.short}</h2>
        <p className="text-[14px] leading-normal text-bark">{[m.area, m.country].filter(Boolean).join(" · ")}.{m.bio ? ` ${m.bio.slice(0, 140)}` : ""}</p>
        <div className="flex flex-wrap gap-1.5">{m.expertise.map((e) => <span key={e} className="rounded-full bg-sand px-[11px] py-1.5 text-[12.5px] font-semibold">{e}</span>)}<span className="inline-flex items-center gap-1 rounded-full bg-mint px-[11px] py-1.5 text-[12.5px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={14} />Reviewed by the team</span></div>
        <p className="text-[12.5px] text-stone">{m.short} never sees your last name, school or contact details.</p>
      </Card>
      <Card className="flex flex-col gap-2 p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your call</h2>
        <p className="text-[14px] leading-normal text-bark">{t.scheduledAt ? `${f(t.scheduledAt, { weekday: "long", day: "numeric", month: "long" })}, ${f(t.scheduledAt, { hour: "numeric", minute: "2-digit", hour12: true })}` : `Not booked yet. Pick a time that works${r.ctx.minor ? ` and ${gName} approves it` : ""}.`}</p>
        {!t.scheduledAt && t.state === "CONNECTION_APPROVED" && <Link href={`/asks/${params.id}/time`} className="dc-btn dc-btn-soft h-11"><Icon name="calendar" size={18} />Pick a time</Link>}
      </Card>
      <section className="flex flex-col gap-2.5 rounded-card bg-blush p-[18px] text-blush-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Something feel off?</h2>
        <p className="text-[13.5px] leading-normal">Report any message. The team reads it the same day and nobody is told it was you.</p>
        <Link href={`/report?ask=${params.id}`} className="inline-flex items-center gap-1.5 self-start rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="flag" size={16} />Report a concern</Link>
      </section>
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false}
      phone={{ back: `/asks/${params.id}`, title: <span className="flex items-center gap-2">{m.short}<span className="rounded-full bg-mint px-2.5 py-1 font-sans text-[11.5px] font-semibold tracking-normal text-mint-ink">Matched</span></span>, right: t.state === "CONNECTION_APPROVED" ? <Link href={`/asks/${params.id}/time`} className="rounded-full bg-sand px-3 py-2 text-[13px] font-bold">Schedule call</Link> : undefined }}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] max-lg:hidden">Your Ask with {m.short}</h1>
      <Card className="flex items-center gap-3 p-4 max-lg:hidden">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{initialsOf(m.short)}</span>
        <div className="min-w-0 flex-1"><p className="text-[16px] font-bold">{m.short}</p><p className="text-[13px] text-stone">{[m.area, m.country].filter(Boolean).join(" · ")}</p></div>
        {t.state === "CONNECTION_APPROVED" && <Link href={`/asks/${params.id}/time`} className="dc-btn dc-btn-soft h-11"><Icon name="calendar" size={18} />Schedule call</Link>}
        <Link href={`/report?ask=${params.id}`} className="dc-btn dc-btn-ghost h-11"><Icon name="flag" size={18} />Report</Link>
      </Card>
      {stay}
      <div className="flex flex-col gap-3">{items}</div>
      <Composer askId={params.id} open={t.open} note={r.ctx.minor ? `Only the platform can call. ${gName[0]!.toUpperCase()}${gName.slice(1)} approves each time.` : "Chats and calls stay here."} />
    </ParticipantShell>
  );
}
