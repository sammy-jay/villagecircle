import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorChangeView, windowOffers } from "@/lib/mentor-extra";
import { APP_TZ } from "@/lib/domain/scheduling";
import { ChallengeRing } from "../../../mentor-kit";
import { ChangeTime } from "../forms";

export const metadata = { title: "Change the time" };
export const dynamic = "force-dynamic";

const weekday = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long" }).format(d);
const longWhen = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(d);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** EX2 Can't make it: offer other windows or hand the conversation back. No direct contact with the family. */
export default async function Change({ params }: { params: { askId: string } }) {
  const r = await mentorPage(`/mentor/conversations/${params.askId}/change`);
  if ("to" in r) redirect(r.to);
  const v = await mentorChangeView(r.ctx.userId, params.askId);
  if (!v) redirect(`/mentor/conversations/${params.askId}`);
  const offers = await windowOffers(r.ctx.userId, 6);
  const suggestions = offers.map((t) => ({ iso: t.toISOString(), label: longWhen(t), sub: `From your ${weekday(t)} window (WAT)` }));
  const aside = (
    <>
      <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold">What the family sees</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">{r.ctx.first} needs to move your conversation. You will be offered new times{v.minor ? " and your guardian approves the one you choose" : ""}. Nothing else changes.</p></Card>
      <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold">What you cannot do</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Message the family directly. All changes go through the team so contact details stay private and everything is recorded.</p></Card>
      <Card className="flex items-center gap-4 p-5"><ChallengeRing hours={v.monthlyHours ? (v.hoursGiven / v.monthlyHours) * 12 : 0} size={64} label={`${fmt(v.hoursGiven)} of ${v.monthlyHours} hours this month`} /><p className="text-[13.5px] leading-normal text-bark"><b className="block text-ink">{fmt(v.hoursGiven)} of {v.monthlyHours} hour{v.monthlyHours === 1 ? "" : "s"}</b>Your hours this month. A moved conversation is not counted until it happens.</p></Card>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ back: `/mentor/conversations/${params.askId}`, title: "Change the time" }} tabs={false}>
      <div>
        <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">{v.start ? `Can't make ${weekday(v.start)}?` : "Need to change this?"}</h1>
        <p className="mt-1 text-[16px] text-bark">Tell the team what you need. Everything goes through the team so contact details stay private.</p>
      </div>
      <Card className="p-5"><p className="text-[13.5px] text-stone">{v.topic} · {v.minor ? "A young person under 18" : "An adult participant"}</p><p className="mt-0.5 text-[17px] font-extrabold">{v.start ? longWhen(v.start) : "No time chosen yet"}</p></Card>
      <Card className="p-5 lg:p-6"><ChangeTime askId={params.askId} suggestions={suggestions} /></Card>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
