import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorAskDetail } from "@/lib/mentor-asks";
import { passAction } from "../../actions";
import { AskHero } from "./hero";

export const metadata = { title: "Ask summary" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** D6 Ask summary: the team's summary, why they thought of you, who will be there, and Step forward / Pass / Suggest a colleague. */
export default async function AskSummary({ params }: { params: { id: string } }) {
  const r = await mentorPage(`/mentor/asks/${params.id}`);
  if ("to" in r) redirect(r.to);
  const d = await mentorAskDetail(r.ctx.userId, params.id);
  if (!d) redirect("/mentor");
  const { summary: s, minor } = d;

  const decide = d.answerable ? (
    <Card className="flex flex-col gap-3 p-5 lg:p-6">
      <h2 className="font-display text-[22px] font-extrabold leading-[1.12]">Would you like to step forward?</h2>
      <p className="text-[14.5px] leading-normal text-bark">Stepping forward is a yes in principle. Then you offer up to three times{minor ? " and the guardian approves one" : " and they choose one"}.</p>
      <Link href={`/mentor/asks/${params.id}/step`} className="dc-btn dc-btn-primary h-[52px] w-full"><Icon name="check" size={18} />Step forward</Link>
      <form action={passAction}><input type="hidden" name="askId" value={params.id} /><button type="submit" className="dc-btn dc-btn-outline h-[52px] w-full">Pass</button></form>
      <Link href={`/mentor/asks/${params.id}/return`} className="dc-btn dc-btn-soft h-[52px] w-full"><Icon name="users" size={18} />Suggest a colleague instead</Link>
      <p className="text-[12.5px] text-stone">Passing is never shown to the participant. The team simply asks someone else.</p>
    </Card>
  ) : (
    <Card className="p-5"><h2 className="font-display text-[20px] font-extrabold">{d.response === "STEPPED_FORWARD" ? "You stepped forward" : "You have answered"}</h2><p className="mt-1.5 text-[14.5px] text-bark">{d.response === "STEPPED_FORWARD" ? `You offered ${d.offered.length} time${d.offered.length === 1 ? "" : "s"}. The team confirms who takes the Ask and we tell you.` : "This Ask is no longer waiting for your answer."}</p></Card>
  );
  const aside = (
    <>
      {decide}
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold">Who will be there</h2>
        <ul className="mt-3 divide-y divide-line">
          {minor && <Row icon="shieldCheck" tone="bg-butter text-butter-ink" title={d.guardianAttends ? "A guardian will attend" : "A guardian approves"} body={d.guardianAttends ? "The participant is under 18. The guardian stays for the whole conversation." : "The participant is under 18. The guardian approves you and the time, and may join."} />}
          <Row icon="video" tone="bg-mint text-mint-ink" title="On the platform, by link" body="No phone numbers or emails are shared. Private contact outside the platform is not allowed." />
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold">Where you will meet</h2>
        <ul className="mt-3 divide-y divide-line">
          <Row icon="video" tone="bg-mint text-mint-ink" title="Platform room" body={`A private room on The Village Circle.${minor ? " Recorded, because the participant is under 18." : ""}`} />
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold">Your hours this month</h2>
        <p className="mt-1.5 text-[14.5px] leading-normal text-bark">{fmt(d.hoursGiven)} of {d.monthlyHours} hour{d.monthlyHours === 1 ? "" : "s"} given.{d.hasCapacity ? "" : " You can still step forward. The team checks this with you before confirming."}</p>
        <Link href="/mentor/availability" className="mt-2 inline-block text-[14.5px] font-bold text-clay">Change my hours</Link>
      </Card>
      <Link href={`/report?ask=${params.id}`} className="inline-flex items-center gap-2 px-2 text-[14.5px] font-bold text-bark"><Icon name="flag" size={17} />Report a concern</Link>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ back: "/mentor", title: "Ask summary" }} tabs={false}>
      <AskHero s={s} minor={minor} guardianAttends={d.guardianAttends} />
      <Card className="flex flex-col gap-3 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[22px] font-extrabold">The summary the team wrote for you</h2><span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[12.5px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={15} />Reviewed by the team</span></div>
        <p className="text-[14px] leading-normal text-bark">Only what you need to decide. An age band is all you see before you are connected. Name, school, location and contact details stay hidden.</p>
        <div className="rounded-[20px] bg-butter px-5 py-4 text-butter-ink"><p className="text-[12px] font-extrabold uppercase tracking-[.07em]">What they want to understand</p><p className="mt-1.5 text-[15.5px] leading-normal">{s.question}</p></div>
        <div className="rounded-[20px] bg-blush px-5 py-4 text-blush-ink"><p className="text-[12px] font-extrabold uppercase tracking-[.07em]">What would help most</p><p className="mt-1.5 text-[15.5px] leading-normal">{s.whatWouldHelp}</p></div>
      </Card>
      <Card className="p-5 lg:p-6">
        <h2 className="font-display text-[20px] font-extrabold">Why the team thought of you</h2>
        <div className="mt-3 flex flex-wrap gap-2">{d.whyThought.map((w) => <span key={w} className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[13.5px] font-semibold text-mint-ink"><Icon name="check" size={15} />{w}</span>)}</div>
      </Card>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}

const Row = ({ icon, tone, title, body }: { icon: IconName; tone: string; title: string; body: string }) => (
  <li className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] ${tone}`}><Icon name={icon} size={20} /></span><span><b className="block text-[15px]">{title}</b><span className="text-[13.5px] leading-snug text-bark">{body}</span></span></li>
);
