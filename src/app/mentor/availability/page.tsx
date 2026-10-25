import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorHours } from "@/lib/insight";
import { AvailabilityForm, RaiseHour } from "../availability-form";
import { ChallengeRing } from "../mentor-kit";

export const metadata = { title: "Hours" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** D23 Availability (weekly windows, limits, pause) and EX12 when this month's hours are given. */
export default async function Availability() {
  const r = await mentorPage("/mentor/availability");
  if ("to" in r) redirect(r.to);
  const h = await mentorHours(r.ctx.userId);
  if (!h) redirect("/mentor");
  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold">How participants see it</h2>
        <p className="mt-1.5 text-[14px] leading-normal text-bark">Up to three times are offered for each Ask, chosen from your windows. They see nothing else about your calendar.</p>
        {h.times.length > 0 && <ul className="mt-3 flex flex-col gap-2">{h.times.map((t) => <li key={t} className="flex items-center justify-between rounded-[14px] bg-sand px-3.5 py-2.5 text-[14px]"><b>{t}</b><span className="text-stone">{h.length} minutes</span></li>)}</ul>}
      </Card>
      <Card className="flex items-center gap-4 p-5"><ChallengeRing hours={h.hoursYear} /><div><h2 className="font-display text-[18px] font-extrabold">One Hour Challenge</h2><p className="text-[13.5px] text-bark">{fmt(h.hoursYear)} of 12 hours this year</p></div></Card>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ title: "Hours" }}>
      {h.atCap ? (
        <section className="flex flex-col gap-4 rounded-[28px] bg-butter p-6 text-butter-ink lg:px-8 lg:py-7">
          <p className="text-[12.5px] font-extrabold uppercase tracking-[.07em]">{h.month}</p>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[36px]">You have given your hours for {h.month}</h1>
          <p className="text-[15.5px] leading-normal">Thank you. You will not receive new Asks until {h.nextMonth}. Nothing else changes.</p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {([[`${fmt(h.given)} of ${h.monthlyHours}`, "hours given"], [String(h.conversationsMonth), "conversations held"], [String(h.thanksMonth), "thanks received"]] as const).map(([n, l]) => <div key={l} className="rounded-[18px] bg-card/70 px-2 py-3"><dd className="font-display text-[22px] font-extrabold">{n}</dd><dt className="text-[12.5px]">{l}</dt></div>)}
          </dl>
          {h.canRaise && <div className="rounded-[20px] bg-card p-4 text-ink"><h2 className="font-display text-[19px] font-extrabold">Want to give a little more?</h2><p className="mb-3 mt-1 text-[14px] text-bark">You can raise this month&apos;s hours once. It reopens your shortlist straight away.</p><RaiseHour /></div>}
          <p className="flex items-start gap-2 text-[13.5px]"><Icon name="heart" size={17} className="mt-px shrink-0" />Giving less than your hours is always fine, and giving them is never expected. Thank you either way.</p>
        </section>
      ) : (
        <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.1] tracking-[-.02em]">Hours</h1><p className="mt-1 text-[16px] text-bark">The platform books 30 or 60 minute conversations inside these windows. You never negotiate times by message.</p></div>
      )}
      {!h.atCap && <p className="text-[15px] text-bark lg:hidden">The platform books conversations inside these windows. You never negotiate times by message.</p>}
      <div id="windows"><AvailabilityForm grid={h.grid} monthlyHours={h.monthlyHours} length={h.length} paused={h.paused} /></div>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
