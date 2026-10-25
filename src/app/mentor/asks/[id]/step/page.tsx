import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorAskDetail } from "@/lib/mentor-asks";
import { windowOffers } from "@/lib/mentor-extra";
import { APP_TZ } from "@/lib/domain/scheduling";
import { AskHero } from "../hero";
import { StepForward } from "../respond-forms";

export const metadata = { title: "Step forward" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const label = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(d);

/** D27 "Step forward": a yes in principle, with up to three times from the mentor's windows. The team confirms who takes the Ask. */
export default async function Step({ params }: { params: { id: string } }) {
  const r = await mentorPage(`/mentor/asks/${params.id}/step`);
  if ("to" in r) redirect(r.to);
  const d = await mentorAskDetail(r.ctx.userId, params.id);
  if (!d) redirect("/mentor");
  if (!d.answerable) redirect(`/mentor/asks/${params.id}`);
  const offers = await windowOffers(r.ctx.userId, 6);
  const suggestions = offers.map((t) => ({ iso: t.toISOString(), label: label(t), sub: `${d.summary.sessionLength} minutes, from your weekly windows (WAT)` }));
  return (
    <MentorShell ctx={r.ctx} phone={{ back: `/mentor/asks/${params.id}`, title: "Step forward" }} tabs={false}
      aside={<Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">If the team chooses someone else</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Another mentor may be the closer fit. We will thank you and you will hear about the next Ask soon. Nobody else sees that you offered.</p></Card>}>
      <AskHero s={d.summary} minor={d.minor} guardianAttends={d.guardianAttends} back={`/mentor/asks/${params.id}`} backLabel="Back to the summary" />
      <Card className="flex flex-col gap-4 p-5 lg:p-6">
        <div>
          <h2 className="font-display text-[22px] font-extrabold">Step forward</h2>
          <p className="mt-1.5 text-[14.5px] leading-normal text-bark">Thank you. Offer up to three times. The team confirms who takes the Ask.{d.minor ? " For a participant under 18, their guardian approves you and the time." : ""}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 rounded-[18px] bg-sand p-4 text-[13.5px]">
          <div><dt className="text-stone">Length</dt><dd className="font-bold">{d.summary.sessionLength} minutes</dd></div>
          <div><dt className="text-stone">Guardian</dt><dd className="font-bold">{d.minor ? (d.guardianAttends ? "Will attend" : "Approves") : "Not needed"}</dd></div>
          <div><dt className="text-stone">Hours this month</dt><dd className="font-bold">{fmt(d.hoursGiven)} of {d.monthlyHours} used</dd></div>
        </dl>
        {!suggestions.length && <p className="rounded-[16px] bg-butter px-4 py-3 text-[14px] text-butter-ink">You have no weekly windows set, so there are no suggestions. Add a time below, or set your windows in Hours.</p>}
        <StepForward askId={params.id} suggestions={suggestions} />
      </Card>
    </MentorShell>
  );
}
