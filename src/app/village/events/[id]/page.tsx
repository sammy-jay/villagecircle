import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, DateTile } from "@/components/app/feed";
import { GoingButton } from "@/components/app/feed-actions";
import { participantPage } from "@/lib/participant-ctx";
import { eventDetail } from "@/lib/village";

export const metadata = { title: "Event" };
export const dynamic = "force-dynamic";

/** D20 Event: what to expect, hosts, the details and registration. */
export default async function EventPage({ params }: { params: { id: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/village/events/${params.id}` : r.to);
  const e = await eventDetail(r.ctx.userId, params.id);
  if (!e) redirect("/village/events");
  const [wd, rest] = [e.when.split(",")[0] ?? "", e.when];
  const day = rest.match(/\d+/)?.[0] ?? "";
  const hosts = e.hosts.split(",").map((h) => h.trim()).filter(Boolean);
  const register = (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{e.past ? "This event has finished" : e.registered ? "You are going" : "Register"}</h2>
      {e.capacity != null && (
        <>
          <div className="h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full rounded-[inherit] bg-forest" style={{ width: `${e.percent}%` }} /></div>
          <p className="text-[13.5px] text-bark">{e.taken} of {e.capacity} places taken. {e.full ? "Full." : `${e.capacity - e.taken} places left.`} Free for everyone.</p>
        </>
      )}
      {!e.past && (!e.full || e.registered) && <GoingButton id={e.id} going={e.registered} />}
      {r.ctx.minor && <p className="text-[12.5px] text-stone"><b>Under 18?</b> Your guardian is told you registered. We send reminders 24 hours and 1 hour before.</p>}
    </Card>
  );
  const details = (
    <Card className="p-5">
      <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">The details</h2>
      <dl className="mt-3 flex flex-col gap-3 text-[14px]">
        {([["WHEN", e.when], ["WHERE", e.where], ["AFTERWARDS", e.recording]] as const).map(([k, v]) => <div key={k}><dt className="text-[12px] font-extrabold tracking-[.05em] text-stone">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>)}
      </dl>
    </Card>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={<>{register}{details}</>} phone={{ back: "/village/events", title: " " }}>
      <section className="flex items-start gap-4 rounded-[28px] bg-butter p-5 text-butter-ink lg:p-7">
        <DateTile month={wd.slice(0, 3).toUpperCase()} day={day} />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5"><span className="rounded-full border-[1.5px] border-current px-3 py-1 text-[12.5px] font-bold">{e.format}</span>{e.topicTag && <span className="rounded-full bg-card px-3 py-1 text-[12.5px] font-semibold text-ink">{e.topicTag}</span>}</div>
          <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.01em] lg:text-[36px]">{e.title}</h1>
          <p className="mt-1.5 text-[15px]">{e.when}</p>
        </div>
      </section>
      {e.description && <Card className="p-5 lg:p-6"><h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">What to expect</h2><p className="mt-2 whitespace-pre-line text-[15px] leading-normal text-bark">{e.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{[e.audience || "All ages", "Free", e.recording].map((x) => <span key={x} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{x}</span>)}</div></Card>}
      {hosts.length > 0 && (
        <Card className="p-5"><h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Your hosts</h2>
          <ul className="mt-3 flex flex-wrap gap-4">{hosts.map((h, i) => <li key={h} className="flex items-center gap-2.5"><span className={["flex size-11 items-center justify-center rounded-full font-display text-[15px] font-bold", ["bg-mint text-mint-ink", "bg-butter text-butter-ink", "bg-blush text-blush-ink"][i % 3]].join(" ")}>{h.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><span className="text-[14.5px] font-bold">{h}</span></li>)}</ul></Card>
      )}
      <div className="flex flex-col gap-4 lg:hidden">{register}{details}</div>
      <p className="flex items-center gap-1.5 text-[13px] text-stone"><Icon name="shieldCheck" size={15} />Nobody sees your name in the room. Questions can be sent anonymously.</p>
    </ParticipantShell>
  );
}
