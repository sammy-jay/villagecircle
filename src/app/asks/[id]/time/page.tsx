import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { trackerView } from "@/lib/connections";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";
import { TimePicker, type Day } from "./time-picker";

export const metadata = { title: "Pick a time" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
const clock = (d: Date) => f(d, { hour: "numeric", minute: "2-digit", hour12: true });

/** D14 Pick a time from the times the mentor offered. Only while the connection is approved and unbooked. */
export default async function PickTime({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/time` : r.to);
  const t = await trackerView(r.ctx.userId, params.id);
  if (!t) redirect("/asks");
  if (t.state !== "CONNECTION_APPROVED" || !t.connection) redirect(`/asks/${params.id}`);
  const mentor = t.mentor?.shortName ?? "Your mentor";
  const now = Date.now();
  const offered = t.connection.offered.filter((d) => d.getTime() > now).sort((a, b) => a.getTime() - b.getTime());
  const days: Day[] = [];
  for (const d of offered) {
    const key = f(d, { year: "numeric", month: "2-digit", day: "2-digit" });
    let day = days.find((x) => x.key === key);
    if (!day) { day = { key, wd: f(d, { weekday: "short" }).toUpperCase(), d: f(d, { day: "numeric" }), mon: f(d, { month: "short" }), times: [] }; days.push(day); }
    day.times.push({ iso: d.toISOString(), label: clock(d), long: `${f(d, { weekday: "long", day: "numeric", month: "long" })}, ${clock(d)}` });
  }
  const guardian = t.minor ? t.guardianName ?? "Your guardian" : null;
  const next: [string, string][] = [["You pick a time", "Today"], ...(guardian ? [[`${guardian} says yes`, "Usually within a day"] as [string, string]] : []), ["The team confirms", "You get a reminder"], ["Your call", "Join from My Asks"]];

  const aside = (
    <>
      <Card className="flex flex-col gap-2.5 p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your Ask</h2>
        <p className="text-[14.5px] leading-normal text-bark">{t.answers.q1}</p>
        <div className="flex flex-wrap gap-1.5">{[t.topic, `${t.connection.minutes} min`].map((x) => <span key={x} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{x}</span>)}</div>
      </Card>
      <Card className="p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {next.map(([a, b], i) => (
            <li key={a} className="flex items-start gap-3">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[15px] font-extrabold", PASTEL[(["butter", "mint", "blush", "butter"] as const)[i]!].both)}>{i + 1}</span>
              <div><p className="text-[15px] font-extrabold">{a}</p><p className="text-[13.5px] text-stone">{b}</p></div>
            </li>
          ))}
        </ol>
      </Card>
      <section className="rounded-card bg-butter p-[18px] text-butter-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Before the call</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px]">{["Write your top 2 questions", "Find a quiet spot", "Test your camera"].map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5" />{x}</li>)}</ul>
      </section>
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false} phone={{ back: `/asks/${params.id}`, title: "Pick a time" }}>
      <div className="max-lg:hidden">
        <p className="text-[13px] font-extrabold uppercase tracking-[.04em] text-clay">{t.topic} · Mentor confirmed: {mentor}</p>
        <h1 className="mt-1.5 font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Pick a time</h1>
        <p className="mt-1.5 text-[16px] leading-normal text-bark">{mentor} offered {offered.length === 1 ? "this time" : `these ${offered.length} times`}. Pick one{guardian ? ` and ${guardian} will be asked to say yes` : ""}.</p>
      </div>
      <h1 className="sr-only lg:hidden">Pick a time</h1>
      <Card className="flex items-center gap-3.5 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{mentor.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold">{mentor}</p>
          <p className="text-[13px] text-stone">{[t.mentor?.headline, t.mentor?.country, t.mentor?.verifiedLine].filter(Boolean).join(" · ")}</p>
        </div>
      </Card>
      <p className="text-[13.5px] text-stone">{t.connection.minutes} minute video call. All times are {APP_TZ() === "Africa/Lagos" ? "Lagos time (WAT)" : `in ${APP_TZ().split("/").pop()?.replace("_", " ")} time`}.</p>
      {days.length ? <TimePicker askId={params.id} days={days} guardian={guardian} mentor={mentor} />
        : <Card className="p-5 text-[15px] text-bark">The offered times have passed. The team has been told and will ask {mentor} for new ones.</Card>}
    </ParticipantShell>
  );
}
