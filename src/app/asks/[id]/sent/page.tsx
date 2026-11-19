import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { Journey, whenLong } from "@/components/app/ask-journey";
import { ASK_STAGES } from "@/lib/domain/ask-stages";
import { participantPage } from "@/lib/participant-ctx";
import { trackerView } from "@/lib/connections";
import { resourcesForTopic } from "@/lib/asks";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { WithdrawDialog } from "../withdraw-dialog";

export const metadata = { title: "Ask sent" };
export const dynamic = "force-dynamic";

/** N05 Ask sent, with the withdraw dialog at `?withdraw=1` (N05-D2). */
export default async function Sent({ params, searchParams }: { params: { id: string }; searchParams: { withdraw?: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/sent` : r.to);
  const t = await trackerView(r.ctx.userId, params.id);
  if (!t) redirect("/asks");
  if (t.state === "DRAFT") redirect(`/asks/${params.id}/edit`);
  const ask = await db.ask.findUnique({ where: { id: params.id }, include: { topic: true } });
  const reads = ask ? (await resourcesForTopic(ask.topic.slug)).slice(0, 2) : [];
  const a = t.answers as typeof t.answers & { stage?: string };
  const self = `/asks/${params.id}/sent`;
  const closed = ["WITHDRAWN", "NOT_PROCEEDING", "REDIRECTED", "GUARDIAN_DECLINED", "LAPSED", "ANSWERED_BY_RESOURCE"].includes(t.state);
  const g = t.guardianName ?? "your guardian";

  const times: [string, string, string][] = [
    ...(t.minor ? [["about 1 day", "1 day", "Guardian approves"] as [string, string, string]] : []),
    ["within 2 working days", "2 days", ASK_STAGES[1].label], ["2 to 5 days", "2 to 5 days", ASK_STAGES[2].label],
  ];
  const tones = ["butter", "mint", "blush"] as const;
  const guardianCard = t.minor && (
    <section className="flex flex-col gap-2.5 rounded-card bg-mint p-5 text-mint-ink">
      <div className="flex items-center gap-2.5"><Icon name="shieldCheck" size={22} /><h2 className="font-display text-[19px] font-extrabold leading-[1.12]">{t.guardianName ? `${t.guardianName} approves` : "Your guardian approves"}</h2></div>
      <p className="text-[14.5px] leading-normal opacity-[.92]">You are under 18, so {g} approves each Ask, mentor and time. Mentors never see your surname, school or contact details.</p>
    </section>
  );
  const editCard = !closed && (
    <Card className="flex flex-col gap-2.5 p-5">
      <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Withdraw</h2>
      <p className="text-[14.5px] leading-normal text-bark">You can withdraw any time. {t.mentor ? "Your mentor is told kindly." : "Nothing is shared with a mentor."}</p>
      <Link href={`${self}?withdraw=1`} scroll={false} className="dc-btn dc-btn-ghost h-[46px] w-full">Withdraw Ask</Link>
    </Card>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/asks", title: "Ask sent" }}
      aside={<>{guardianCard}{editCard}<Link href="/asks" className="dc-btn dc-btn-forest h-[50px] w-full">Go to My Asks</Link></>}>
      <section className="flex items-center gap-[22px] rounded-[30px] bg-mint p-6 text-mint-ink lg:rounded-[32px] lg:px-8 lg:py-[30px]">
        <span className="flex size-16 shrink-0 -rotate-[5deg] items-center justify-center rounded-[22px] bg-card lg:size-[76px] lg:rounded-[26px]"><Icon name="send" size={34} /></span>
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[38px]">{closed ? "This Ask is closed" : "Your Ask is on its way"}</h1>
          <p className="mt-2 text-[15.5px] leading-normal opacity-[.92] lg:text-[16.5px]">{closed ? "Your answers are saved. You can start a new Ask any time." : t.minor ? `It goes to ${g} first, then to the team. You do not need to do anything now.` : "It goes to the team first. You do not need to do anything now."}</p>
        </div>
      </section>
      <Card className="flex flex-col gap-3 p-[18px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full border-[1.5px] border-butter-ink px-3 py-[5px] text-[12.5px] font-bold text-butter-ink">Your Ask</span>
          {t.marks.submitted && <span className="text-[12.5px] leading-[1.4] text-stone">Sent {whenLong(t.marks.submitted)}</span>}
        </div>
        <p className="text-[15.5px] leading-normal">{a.q1}</p>
        <div className="flex flex-wrap items-center gap-2">
          {[`Topic: ${t.topic}`, a.stage && `Stage: ${a.stage}`, a.preferredMentorName && `Preferred: ${a.preferredMentorName}`].filter(Boolean).map((x) => <span key={x as string} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{x}</span>)}
        </div>
      </Card>
      <Card className="flex flex-col gap-3 p-[22px]">
        <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
        <Journey j={{ ...t, preferred: a.preferredMentorName }} />
        <h2 className="mt-2 font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">How long it usually takes</h2>
        <div className="flex gap-2.5">
          {times.map(([d, m, l], i) => (
            <div key={l} className={cn("min-w-0 flex-1 rounded-[20px] p-3.5", PASTEL[tones[i]!].both)}>
              <p className="font-display text-[18px] font-extrabold leading-[1.1]"><span className="lg:hidden">{m}</span><span className="max-lg:hidden">{d}</span></p>
              <p className="mt-1 text-[12.5px] opacity-90">{l}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="lg:hidden">{guardianCard}</div>
      {reads.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Read while you wait</h2><Link href="/village/library" className="text-[13.5px] font-bold text-clay">Open Library</Link></div>
          <div className="mt-3 flex flex-col gap-3.5 lg:flex-row lg:items-stretch">
            {reads.map((x, i) => (
              <Link key={x.id} href={`/village/library/${x.id}`} className={cn("flex min-w-0 flex-1 flex-col gap-2.5 rounded-card p-[18px]", PASTEL[i ? "blush" : "butter"].both)}>
                <span className="self-start rounded-full border-[1.5px] border-current px-3 py-[5px] text-[12.5px] font-bold">{x.type === "TEMPLATE" ? "Template" : x.type === "ARTICLE" ? "Answer" : x.type === "GUIDE" ? "Guide" : "Recording"}</span>
                <span className="flex-1 font-display text-[17px] font-extrabold leading-[1.12]">{x.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="flex flex-col gap-4 lg:hidden">{editCard}<Link href="/asks" className="dc-btn dc-btn-forest h-[50px] w-full">Go to My Asks</Link></div>
      {searchParams.withdraw === "1" && !closed && <WithdrawDialog askId={params.id} back={self} minor={t.minor} shared={!!t.mentor} />}
    </ParticipantShell>
  );
}
