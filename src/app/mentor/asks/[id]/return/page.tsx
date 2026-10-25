import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorAskDetail } from "@/lib/mentor-asks";
import { AskHero } from "../hero";
import { ReturnAsk } from "../respond-forms";

export const metadata = { title: "Return an Ask" };
export const dynamic = "force-dynamic";

const REASONS = ["Outside my experience", "Someone else would fit better", "I do not have the time this month", "Something else"];

/** EX13 Return Ask: send it back kindly with a reason and an optional colleague. The participant never sees this. */
export default async function ReturnPage({ params }: { params: { id: string } }) {
  const r = await mentorPage(`/mentor/asks/${params.id}/return`);
  if ("to" in r) redirect(r.to);
  const d = await mentorAskDetail(r.ctx.userId, params.id);
  if (!d) redirect("/mentor");
  if (!d.answerable) redirect(`/mentor/asks/${params.id}`);
  const aside = (
    <>
      <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold">What the participant sees</h2><p className="mt-1 font-display text-[22px] font-extrabold text-forest">Nothing</p><p className="mt-1 text-[14px] leading-normal text-bark">Passing is never visible to the participant, and it never lowers your standing.</p></Card>
      <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold">What the team sees</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Your reason, your note and your suggestion. The Ask goes back to review with them attached.</p></Card>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ back: `/mentor/asks/${params.id}`, title: "Return to the team" }} tabs={false}>
      <AskHero s={d.summary} minor={d.minor} guardianAttends={d.guardianAttends} back={`/mentor/asks/${params.id}`} backLabel="Back to the summary" />
      <Card className="flex flex-col gap-4 p-5 lg:p-6">
        <div>
          <h2 className="font-display text-[24px] font-extrabold">Send it back kindly</h2>
          <p className="mt-1.5 text-[14.5px] leading-normal text-bark">Return it to the team with a note. The participant is never told you passed. A team member finds a better fit, and you are never marked down for this.</p>
        </div>
        <ReturnAsk askId={params.id} reasons={REASONS} />
      </Card>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
