import Link from "next/link";
import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorImpact } from "@/lib/insight";
import { ChallengeRing } from "../mentor-kit";

export const metadata = { title: "My impact" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** D25 Impact: counts only, never a target or a ranking. Thanks are read by the team before they show. */
export default async function Impact() {
  const r = await mentorPage("/mentor/impact");
  if ("to" in r) redirect(r.to);
  const v = await mentorImpact(r.ctx.userId);
  if (!v) redirect("/mentor");
  const top = Math.max(1, ...v.byMonth.map((m) => m.hours));
  const stats: [string, string][] = [[fmt(v.hoursThisYear), "hours given this year"], [String(v.conversationsHeld), "conversations held"], [String(v.thanks), "thank-you notes"], [String(v.resources), "resources shared"]];
  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold">Hours by month</h2>
        <div className="mt-4 flex h-[140px] items-end gap-3 border-b border-line" aria-hidden="true">
          {v.byMonth.map((m) => (
            <div key={m.label} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] bg-ink px-2 py-1 text-[12px] font-semibold text-paper group-hover:block">{m.label}: {fmt(m.hours)} hr</span>
              <span className="block rounded-t-[4px] bg-forest" style={{ height: m.hours ? `${Math.max(4, (m.hours / top) * 100)}%` : 0 }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-3 text-center text-[12px] text-stone" aria-hidden="true">{v.byMonth.map((m) => <span key={m.label} className="flex-1">{m.label}</span>)}</div>
        <table className="sr-only"><caption>Hours given by month</caption><tbody>{v.byMonth.map((m) => <tr key={m.label}><th scope="row">{m.label}</th><td>{fmt(m.hours)} hours</td></tr>)}</tbody></table>
      </Card>
      <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">Monthly round-up</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Your {v.month} note arrives on the first business day of {v.nextMonth}. It lists what you gave and what changed because of it.</p></Card>
      <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">Public profile</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Approved thanks appear on your profile. You can hide your profile in settings.</p><Link href="/mentor/profile" className="mt-2 inline-block text-[14.5px] font-bold text-clay">View my profile</Link></Card>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ title: "My impact" }}>
      <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only lg:text-[40px]">My impact</h1><p className="mt-1 text-[16px] text-bark">Just counts, never a target and never a ranking. Thank you for being part of the village.</p></div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([n, l]) => <Card key={l} className="p-4"><dd className="font-display text-[32px] font-extrabold leading-none">{n}</dd><dt className="mt-1.5 text-[13px] text-bark">{l}</dt></Card>)}
      </dl>
      <section className="flex items-center gap-5 rounded-[28px] bg-butter p-6 text-butter-ink">
        <ChallengeRing hours={v.hoursThisYear} size={92} />
        <div><p className="text-[12px] font-extrabold uppercase tracking-[.07em]">The One Hour Challenge</p><p className="mt-1 font-display text-[22px] font-extrabold">{fmt(v.hoursThisYear)} of 12 hours towards your badge</p><p className="mt-1 text-[14px]">Twelve hours earns the badge. There are no league tables and no star ratings.</p></div>
      </section>
      <Card className="p-5 lg:p-6">
        <h2 className="font-display text-[22px] font-extrabold">Thanks you have received</h2>
        {v.quotes.length ? (
          <ul className="mt-3 flex flex-col gap-3">
            {v.quotes.map((q, i) => <li key={q.id} className={`rounded-[20px] px-5 py-4 ${i % 2 ? "bg-mint text-mint-ink" : "bg-blush text-blush-ink"}`}><p className="font-display text-[18px] leading-snug">&ldquo;{q.body}&rdquo;</p><p className="mt-1.5 text-[13px]">{q.from} · read by the team first</p></li>)}
          </ul>
        ) : <p className="mt-2 text-[14.5px] text-bark">Thank-you notes appear here once the team has read them.</p>}
      </Card>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
