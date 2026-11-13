import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Toggle } from "@/components/dc/client";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { SignOutButton } from "@/components/app/sign-out";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorSettings } from "@/lib/insight";
import { reaffirmView } from "@/lib/reaffirm";
import { APP_TZ } from "@/lib/domain/scheduling";
import { listedAction } from "../actions";
import { AvailabilityForm } from "../availability-form";
import { ChallengeRing } from "../mentor-kit";
import { ReaffirmForm } from "../reaffirm-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "long" }).format(d);

/** D7 Settings (both states of the re-affirmation card): how much and when, the yearly promise, the challenge, privacy and data. */
export default async function MentorSettings() {
  const r = await mentorPage("/mentor/settings");
  if ("to" in r) redirect(r.to);
  const [s, v] = await Promise.all([mentorSettings(r.ctx.userId), reaffirmView(r.ctx.userId)]);
  if (!s || !v) redirect("/mentor");
  const rows: [string, string, string, string][] = [
    ["Notifications", "New Ask, reminders, monthly note.", "/settings/notifications", "Edit"],
    ["Download my data", "A file of everything we hold", "/settings/data", "Request"],
    ["Delete my account", "30 days to change your mind", "/settings/delete", "Start"],
  ];
  return (
    <MentorShell ctx={r.ctx} phone={{ title: "Me" }}>
      <h1 className="font-display text-[40px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only">Settings</h1>
      <Link href="/mentor/profile" className="flex items-center gap-3.5 rounded-card border border-line bg-card p-4 lg:hidden"><span className="flex size-12 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{r.ctx.short.slice(0, 1)}</span><span className="flex-1"><b className="block text-[16px]">{s.name}</b><span className="text-[13px] text-stone">Profile and privacy</span></span><Icon name="chevronRight" size={18} className="text-stone" /></Link>
      <nav aria-label="More" className="grid grid-cols-2 gap-2 lg:hidden">
        {([["/mentor/volunteer", "users", "Community"], ["/mentor/responses", "check", "Your responses"], ["/mentor/contribute", "plus", "Share something"], ["/notifications", "bell", "Notifications"]] as const).map(([h, i, l]) => <Link key={h} href={h} className="flex items-center gap-2.5 rounded-[18px] bg-sand px-4 py-3.5 text-[14.5px] font-bold"><Icon name={i} size={18} />{l}</Link>)}
      </nav>
      <section className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] font-extrabold">How much, and when</h2>
        <p className="text-[14.5px] text-bark">You decide. Change it any time. Hours a month: <b>{s.monthlyHours}</b>, conversations of <b>{s.length} minutes</b>. <Link href="/mentor/availability" className="font-bold text-clay">Change limits</Link></p>
      </section>
      <AvailabilityForm compact grid={s.grid} monthlyHours={s.monthlyHours} length={s.length} paused={s.paused} lastSaved={day(s.lastSaved)} />

      <Card className="flex flex-col gap-3 p-5 lg:p-6">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sand px-3 py-1.5 text-[12.5px] font-semibold">Every 12 months</span>{v.nextDueAt && <span className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${v.dueSoon || v.kind === "LAPSED" ? "bg-blush text-blush-ink" : "bg-mint text-mint-ink"}`}>Due {day(v.nextDueAt)}</span>}</div>
        <h2 className="font-display text-[22px] font-extrabold">Re-affirm your safeguarding promise</h2>
        {v.canAffirm ? (
          <>
            <p className="text-[14.5px] text-bark">{v.dueSoon || v.kind === "LAPSED" ? "Until you do, you will not receive Asks from under 18s. It takes a minute." : "Your promise is current. You can confirm it again early if you like."}</p>
            <ReaffirmForm inline label="Re-affirm" affirmText="I still meet every safeguarding commitment: no child-safety history, the Code of Conduct, the background check, and no swapping of contact details." />
          </>
        ) : <p className="text-[14.5px] text-bark">The team is in touch with you about your mentoring. <Link href="/mentor/reaffirm" className="font-bold text-clay">See where things stand</Link></p>}
      </Card>

      <Card className="flex items-center gap-4 p-5"><ChallengeRing hours={s.hoursYear} /><div><h2 className="font-display text-[19px] font-extrabold">Hours given</h2><p className="text-[14px] text-bark">{s.hoursYear} of 12 this year</p><p className="mt-1 text-[12.5px] text-stone">Your own tally for the One Hour Challenge. Never compared with anyone, and it does not change who sees your Asks.</p></div></Card>

      <Card className="px-5 py-2 lg:px-6">
        <h2 className="pt-3 font-display text-[22px] font-extrabold">Privacy and your data</h2>
        <form action={listedAction} className="border-b border-line">
          <Toggle name="listed" defaultChecked={s.listed} disabled={!s.approved} label="Show me in the directory" sub="Expertise only. Never contact details." />
          <button type="submit" className="mb-3 text-[13.5px] font-bold text-clay">Save directory choice</button>
        </form>
        <ul className="divide-y divide-line">
          {rows.map(([t, sub, href, cta]) => <li key={t}><Link href={href} className="flex items-center gap-3 py-4"><span className="flex-1"><b className="block text-[15.5px]">{t}</b><span className="text-[13px] text-stone">{sub}</span></span><span className="text-[14px] font-bold text-clay">{cta}</span></Link></li>)}
        </ul>
      </Card>
      <SignOutButton className="self-start px-2" />
    </MentorShell>
  );
}
