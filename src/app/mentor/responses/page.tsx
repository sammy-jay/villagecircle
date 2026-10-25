import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorResponses } from "@/lib/mentor-extra";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";

export const metadata = { title: "Your responses" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "short", day: "numeric", month: "short" }).format(d);
const TONE: Record<string, string> = { Booked: "bg-mint text-mint-ink", "Waiting for the team": "bg-butter text-butter-ink", "Closer fit found": "bg-sand", Passed: "bg-sand", "Suggested a colleague": "bg-blush text-blush-ink" };
const CHOICES: [IconName, string, string, string][] = [
  ["check", "bg-mint text-mint-ink", "Step forward", "You offer up to three times from your windows. The team confirms who takes the Ask. For a minor, their guardian approves you and the time."],
  ["users", "bg-blush text-blush-ink", "Suggest a colleague", "Does it sit outside your experience? Tell the team who might be better placed. They hand it on with your note."],
  ["arrowRight", "bg-sand", "Pass", "No explanation needed. Passing is never shown to the participant and never affects your standing or how many Asks you receive."],
];

/** D27 Responses: what each choice does, and this mentor's own history. Only they and the team see it. */
export default async function Responses({ searchParams }: { searchParams: { done?: string } }) {
  const r = await mentorPage("/mentor/responses");
  if ("to" in r) redirect(r.to);
  const v = await mentorResponses(r.ctx.userId);
  if (!v) redirect("/mentor");
  return (
    <MentorShell ctx={r.ctx} phone={{ back: "/mentor", title: "Your responses" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.1] tracking-[-.02em]">Your responses</h1><p className="mt-1 text-[16px] text-bark">What happens on each choice. None of them is ever shown to the participant as a refusal.</p></div>
      {searchParams.done === "stepped" && (
        <section role="status" className="rounded-[24px] bg-mint p-5 text-mint-ink">
          <p className="flex items-center gap-2 font-display text-[21px] font-extrabold"><Icon name="check" size={20} />Thank you for stepping forward</p>
          <p className="mt-1 text-[14.5px] leading-normal">The team confirms who takes the Ask and tells you. If another mentor is the closer fit this time, we will thank you and you will hear about the next Ask soon.</p>
        </section>
      )}
      <div className="grid gap-3 lg:grid-cols-3">
        {CHOICES.map(([icon, tone, t, b]) => (
          <Card key={t} className="flex flex-col gap-2 p-5">
            <span className={cn("flex size-10 items-center justify-center rounded-[13px]", tone)}><Icon name={icon} size={19} /></span>
            <h2 className="font-display text-[18px] font-extrabold">{t}</h2>
            <p className="text-[13.5px] leading-normal text-bark">{b}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 lg:p-6">
        <h2 className="font-display text-[22px] font-extrabold">Your history</h2>
        <p className="mt-1 text-[14px] text-bark">Only you and the team see this. It is never shown to a participant and never counts against you.</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {([["stepped forward", v.counts.stepped], ["suggested a colleague", v.counts.referred], ["passed", v.counts.passed]] as const).map(([l, n]) => <div key={l} className="rounded-[18px] bg-sand px-2 py-3"><dd className="font-display text-[26px] font-extrabold">{n}</dd><dt className="text-[12.5px] text-bark">{l}</dt></div>)}
        </dl>
        {v.rows.length ? (
          <ul className="mt-4 divide-y divide-line">
            {v.rows.map((x) => (
              <li key={x.askId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="min-w-0 flex-1"><b className="block text-[15px]">{x.title}</b>{x.at && <span className="text-[13px] text-stone">{day(x.at)}</span>}</span>
                <span className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", TONE[x.outcome] ?? "bg-sand")}>{x.outcome}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-[14.5px] text-bark">Nothing yet. When you answer an Ask from your inbox, it is listed here.</p>}
      </Card>
    </MentorShell>
  );
}
