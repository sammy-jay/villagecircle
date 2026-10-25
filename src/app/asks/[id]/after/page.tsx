import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { afterParticipantView } from "@/lib/connections";
import { upcomingEvents } from "@/lib/village";
import { APP_TZ } from "@/lib/domain/scheduling";
import { followUpAction, outcomeAction } from "@/app/asks/actions";
import { AfterForm } from "./after-form";

export const metadata = { title: "After the call" };
export const dynamic = "force-dynamic";

const f = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);

/** D16 After the call. If the call is still marked as booked, first ask whether it happened. */
export default async function AfterCall({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/after` : r.to);
  const v = await afterParticipantView(r.ctx.userId, params.id);
  if (!v) redirect(`/asks/${params.id}`);
  const next = (await upcomingEvents(r.ctx.userId, 1))[0];
  const ctx = { name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread };

  if (v.state === "SCHEDULED") {
    return (
      <ParticipantShell ctx={ctx} phone={{ back: `/asks/${params.id}`, title: "Call complete" }}>
        <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Did your call with {v.mentorShort} happen?</h1>
        <p className="text-[15.5px] text-bark">Tell us so we can close it off and send your next steps. Only the team reads this.</p>
        <div className="flex flex-col gap-3 lg:flex-row">
          {([["HAPPENED", "Yes, we talked", "check"], ["PROBLEM", "No, something went wrong", "alert"]] as const).map(([o, l, i]) => (
            <form key={o} action={outcomeAction} className="flex-1">
              <input type="hidden" name="askId" value={params.id} /><input type="hidden" name="outcome" value={o} />
              <button type="submit" className={o === "HAPPENED" ? "dc-btn dc-btn-forest h-14 w-full" : "dc-btn dc-btn-ghost h-14 w-full"}><Icon name={i} size={18} />{l}</button>
            </form>
          ))}
        </div>
      </ParticipantShell>
    );
  }

  const aside = (
    <>
      {v.state === "COMPLETE" && (
        <Card className="flex flex-col gap-2.5 p-[18px]">
          <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Want more?</h2>
          <p className="text-[14px] text-bark">You can ask {v.mentorFirst} for a short follow-up, or start a new Ask.</p>
          <form action={followUpAction}><input type="hidden" name="askId" value={params.id} /><button type="submit" className="dc-btn dc-btn-soft h-11 w-full">Ask {v.mentorFirst} again</button></form>
          <Link href="/asks/new" className="dc-btn dc-btn-ghost h-11">Start a new Ask</Link>
        </Card>
      )}
      {v.minor && v.guardianFirst && <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink"><b>{v.guardianFirst} gets a short summary.</b> They see the time, the topic and how it went, not your private notes.</section>}
      <section className="flex flex-col gap-2.5 rounded-card bg-blush p-[18px] text-blush-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Something not right?</h2>
        <p className="text-[13.5px] leading-normal">You can tell the team privately. Nothing is shared with {v.mentorFirst}.</p>
        <Link href={`/report?ask=${params.id}`} className="inline-flex items-center gap-1.5 self-start rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="flag" size={16} />Report a concern</Link>
      </section>
      {next && <Card className="p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Next up</h2><Link href={`/village/events/${next.id}`} className="mt-1.5 block text-[14px] text-bark">{next.title}. {next.meta}.</Link></Card>}
    </>
  );
  return (
    <ParticipantShell ctx={ctx} aside={aside} tabs={false} phone={{ back: `/asks/${params.id}`, title: "Call complete", right: <Link href={`/asks/${params.id}`} className="text-[14.5px] font-extrabold text-clay">Later</Link> }}>
      <div>
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.04em] text-clay lg:text-[13px]">Call complete · with {v.mentorShort}</p>
        <h1 className="mt-1.5 font-display text-[32px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">How did it go?</h1>
        <p className="mt-1.5 text-[15.5px] text-bark">{v.endedAt ? `Your call ended at ${f(v.endedAt, { hour: "numeric", minute: "2-digit", hour12: true })}. ` : ""}Only the team reads this.</p>
      </div>
      {searchParams.sent === "1" && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Thank you. Saved{v.thanked ? ", and your thanks is with the team" : ""}.</p>}
      <AfterForm askId={params.id} mentor={v.mentorFirst} steps={v.nextSteps} thanked={v.thanked} minor={v.minor} />
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
