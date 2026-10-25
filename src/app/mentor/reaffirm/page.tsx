import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { REAFFIRM_TEXT, reaffirmDates, reaffirmView } from "@/lib/reaffirm";
import { APP_TZ } from "@/lib/domain/scheduling";
import { Disclose, ReaffirmForm } from "../reaffirm-form";

export const metadata = { title: "Annual re-affirmation" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short", year: "numeric" }).format(d);
const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "2-digit", minute: "2-digit" }).format(d);
const PLAIN = [
  "I have never been charged with or convicted of an offence involving child endangerment, abuse, neglect or exploitation.",
  "I am not on any child abuse register or sex offender registry, in any country.",
  "I understand a false statement ends my mentoring straight away.",
  "I will tell the team immediately if my circumstances change.",
];

/** P04 / EX11 Annual re-affirmation: due, overdue (paused), signed (P04-D2), and "we are looking at what you told us" (EX11-D3). */
export default async function Reaffirm({ searchParams }: { searchParams: { done?: string } }) {
  const r = await mentorPage("/mentor/reaffirm", "profile");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const [v, d] = await Promise.all([reaffirmView(c.userId), reaffirmDates(c.userId)]);
  if (!v) redirect("/mentor");
  const why = v.kind === "LAPSED" ? "Re-affirmation overdue" : v.kind === "DISCLOSURE" ? "Change in circumstances" : v.kind === "REMOVAL" ? "Under review by the team" : null;
  const stateCard = (
    <Card className="p-5">
      <h2 className="font-display text-[19px] font-extrabold">{v.paused || v.kind ? "Your paused state" : "Your statement"}</h2>
      <dl className="mt-3 divide-y divide-line text-[14px]">
        {(why ? [["Why", why], ...(d.last ? [["Last signed", day(d.last)]] : []), ["Open conversations", "Kept. You can still attend them"], ["New Asks", v.canAffirm ? "Paused until you affirm" : "Paused until the team has spoken with you"], ["Your standing", "Not affected"]]
          : [["Status", "Current"], ...(d.last ? [["Last signed", day(d.last)]] : []), ...(v.nextDueAt ? [["Next due", day(v.nextDueAt)]] : []), ["Your standing", "Not affected"]]).map(([k, val]) => (
          <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-bark">{k}</dt><dd className="text-right font-bold">{val}</dd></div>
        ))}
      </dl>
    </Card>
  );
  const disclose = (
    <Card className="flex flex-col gap-2 p-5">
      <p className="text-[12px] font-extrabold uppercase tracking-[.07em] text-bark">If your circumstances have changed</p>
      <p className="text-[14px] leading-normal text-bark">Contact the safeguarding lead. We will talk with you in confidence, and this pause is not a judgment.</p>
      <Disclose />
    </Card>
  );

  if (searchParams.done === "1" && !v.kind) {
    const signed = d.last ?? new Date();
    return (
      <MentorShell ctx={c} phone={{ back: "/mentor", title: "Re-affirmation" }} aside={<Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">Your statement</h2><dl className="mt-3 divide-y divide-line text-[14px]">{[["Status", "Confirmed"], ["Signed", day(signed)], ["Next due", v.nextDueAt ? day(v.nextDueAt) : "In 12 months"], ["Your standing", "Not affected"]].map(([k, val]) => <div key={k} className="flex justify-between py-2"><dt className="text-bark">{k}</dt><dd className="font-bold">{val}</dd></div>)}</dl><p className="mt-2 text-[12.5px] text-stone">A copy is stored with a time stamp. The team can show it to you at any time.</p></Card>}>
        <section className="rounded-[28px] bg-mint p-6 text-mint-ink lg:px-8 lg:py-7">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[38px]">Thank you, {c.first}. You are all set.</h1>
          <p className="mt-2 text-[15.5px] leading-normal">Your statement is confirmed and your mentoring is on. New Asks can reach you.</p>
          <div className="mt-4 rounded-[20px] bg-card/70 px-5 py-4"><p className="text-[11.5px] font-extrabold uppercase tracking-[.08em]">Signed by</p><p className="mt-1 font-hand text-[36px] font-semibold leading-none text-ink">{c.name}</p><p className="mt-1.5 text-[13px]">{day(signed)} · {time(signed)} WAT</p></div>
        </section>
        <Card className="p-5 lg:p-6">
          <h2 className="font-display text-[20px] font-extrabold">What happens now</h2>
          <ol className="mt-3 flex flex-col gap-3 text-[14.5px]">
            <li className="flex gap-3"><Icon name="check" size={18} className="mt-0.5 text-forest" /><span><b className="block">Statement confirmed</b><span className="text-stone">{day(signed)} at {time(signed)} WAT</span></span></li>
            <li className="flex gap-3"><Icon name="check" size={18} className="mt-0.5 text-forest" /><span><b className="block">Mentoring on</b><span className="text-stone">New Asks can reach you from now</span></span></li>
            <li className="flex gap-3"><Icon name="calendar" size={18} className="mt-0.5 text-stone" /><span><b className="block">Next re-affirmation</b><span className="text-stone">{v.nextDueAt ? `We will remind you from ${day(new Date(v.nextDueAt.getTime() - 14 * 86400_000))}` : "In 12 months"}</span></span></li>
          </ol>
        </Card>
        <div className="flex flex-wrap gap-2.5"><Link href="/mentor" className="dc-btn dc-btn-primary h-[52px]">Back to my inbox</Link><Link href="/mentor/availability" className="dc-btn dc-btn-soft h-[52px]">See my hours</Link></div>
      </MentorShell>
    );
  }

  if (!v.canAffirm) {
    return (
      <MentorShell ctx={c} phone={{ back: "/mentor", title: "Your mentoring" }} aside={<>{stateCard}</>}>
        <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">Your mentoring is paused</h1><p className="mt-1 text-[16px] text-bark">You will not receive new Asks while this is in place.</p></div>
        <Card className="flex flex-col gap-3 p-5 lg:p-6">
          <h2 className="font-display text-[22px] font-extrabold">We are looking at what you told us</h2>
          <p className="text-[15px] text-bark">A member of the team will be in touch with you directly.</p>
          <ol className="mt-1 flex flex-col gap-3 text-[14.5px]">
            {[["You told us", "Thank you for telling us straight away."], ["The team reads it", "A member of the team looks at it with care."], ["A person gets in touch", "They will contact you directly. You do not need to do anything."], ["Next steps together", "You will know what happens to your mentoring."]].map(([t, b], i) => (
              <li key={t} className="flex gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${i === 0 ? "bg-forest text-forest-ink" : "bg-sand"}`}>{i === 0 ? <Icon name="check" size={15} /> : i + 1}</span><span><b className="block">{t}</b><span className="text-stone">{b}</span></span></li>
            ))}
          </ol>
        </Card>
        <div className="lg:hidden">{stateCard}</div>
      </MentorShell>
    );
  }

  const due = v.kind === "LAPSED" || v.dueSoon;
  return (
    <MentorShell ctx={c} phone={{ back: "/mentor", title: "Re-affirmation" }} aside={<>{stateCard}{disclose}</>}>
      {v.paused && <p className="flex items-start gap-3 rounded-[18px] bg-blush px-4 py-3.5 text-[14.5px] text-blush-ink"><Icon name="pause" size={20} className="mt-px shrink-0" /><span><b>Your mentoring is paused.</b> You will not receive new Asks while this is in place. This pause is not a judgment.</span></p>}
      <div>
        <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">{due ? "Your annual re-affirmation is due" : "Your safeguarding statement"}</h1>
        <p className="mt-1 text-[16px] text-bark">{due ? "We ask every mentor to confirm their safeguarding statement once a year. It takes two minutes." : `Your statement is current${v.nextDueAt ? ` until ${day(v.nextDueAt)}` : ""}. You can confirm it again early if you like.`}</p>
      </div>
      <Card className="flex flex-col gap-3 p-5 lg:p-6">
        <h2 className="font-display text-[20px] font-extrabold">Confirm your statement</h2>
        <p className="rounded-[18px] bg-sand px-4 py-3.5 text-[15px] leading-normal">{REAFFIRM_TEXT}</p>
        <p className="text-[12px] font-extrabold uppercase tracking-[.07em] text-bark">In plain words</p>
        <ul className="flex flex-col gap-2 text-[14.5px] text-bark">{PLAIN.map((p) => <li key={p} className="flex gap-2.5"><Icon name="check" size={17} className="mt-0.5 shrink-0 text-forest" />{p}</li>)}</ul>
      </Card>
      <ReaffirmForm label={v.paused ? "Affirm and resume mentoring" : "Affirm my statement"} />
      <div className="flex flex-col gap-4 lg:hidden">{stateCard}{disclose}</div>
    </MentorShell>
  );
}
