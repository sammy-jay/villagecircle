import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { mentorAfterView, preJoinView } from "@/lib/connections";
import { mentorChangeView } from "@/lib/mentor-extra";
import { APP_TZ } from "@/lib/domain/scheduling";
import { Preview } from "@/app/asks/[id]/call/prejoin";
import { CloseOut, MentorJoin } from "./forms";
import { StartsLine } from "@/components/app/call-clock";

export const metadata = { title: "Your conversation" };
export const dynamic = "force-dynamic";

const longWhen = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(d);

/** CL4 Before you join (including too early), or D8 After the call once it has ended. `?after=1` comes from leaving the room. */
export default async function Conversation({ params, searchParams }: { params: { askId: string }; searchParams: { after?: string } }) {
  const r = await mentorPage(`/mentor/conversations/${params.askId}`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx; const id = params.askId;
  const pj = await preJoinView(c.userId, id);
  const live = pj && pj.role === "MENTOR" && pj.state !== "ENDED" && searchParams.after !== "1";

  if (pj && live) {
    const start = pj.start;
    // The countdown, the note and the Join button tick in the browser from the server's time, so nothing waits for a refresh.
    const timing = { startISO: start.toISOString(), minutes: pj.minutes, serverNow: Date.now() };
    const card = pj.other!;
    const aside = (
      <>
        <Card className="p-5">
          <h2 className="font-display text-[19px] font-extrabold">Add to calendar</h2>
          <a href={`/mentor/conversations/${id}/ics`} className="mt-3 inline-flex items-center gap-2 text-[14.5px] font-bold text-clay"><Icon name="download" size={17} />Download .ics</a>
          <p className="mt-1 text-[12.5px] text-stone">Works with Google, Outlook and Apple calendars.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-[19px] font-extrabold">Who you will meet</h2>
          <div className="mt-3 flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-blush font-display text-[17px] font-bold text-blush-ink" aria-hidden="true">{card.firstName[0]}</span><p className="leading-tight"><b className="block text-[16px]">{card.firstName}</b><span className="text-[13.5px] text-stone">{card.ageLabel === "adult" ? "Adult" : `Age ${card.ageLabel}`}</span></p></div>
          <p className="mt-3 text-[13px] text-stone">First name only is shown in the call. School and contact details are never shared.</p>
        </Card>
        <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">If anything feels wrong</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Use Report a concern. It is in the call at all times. One press pauses the connection and alerts our safeguarding lead.</p></Card>
      </>
    );
    return (
      <MentorShell ctx={c} aside={aside} phone={{ back: "/mentor?tab=scheduled", title: "Before you join" }} tabs={false}>
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">Before you join</h1>
          <p className="mt-1 text-[17px] font-bold text-clay" aria-live="polite">{pj.paused ? "This conversation is paused" : <StartsLine clock={timing} />}</p>
          <p className="mt-1 text-[15px] text-bark">{longWhen(start)} · {pj.minutes} minutes · {pj.topic} with {card.firstName}</p>
        </div>
        <Preview />
        <Card className="flex flex-col gap-3 p-5 lg:p-6">
          <h2 className="font-display text-[20px] font-extrabold">Please read before you start</h2>
          <ul className="divide-y divide-line">
            {pj.recorded && <Item icon="video" title="This conversation is recorded" body="Because the participant is under 18. The recording is available to the guardian and our safeguarding lead." />}
            {card.guardianWillAttend && <Item icon="shieldCheck" title="The guardian will attend" body="You were told this when you stepped forward. They may step out and stay reachable." />}
            <Item icon="lock" title="I will keep everything on the platform" body="No phone numbers, emails, social handles or other meeting links, in either direction." />
          </ul>
        </Card>
        {pj.paused ? <p className="rounded-[18px] bg-blush px-4 py-3 text-[14.5px] text-blush-ink">A concern was raised, so this conversation cannot be joined. The team will contact you.</p>
          : <MentorJoin askId={id} clock={timing} />}
        <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
      </MentorShell>
    );
  }

  const av = await mentorAfterView(c.userId, id);
  if (av) {
    const done = av.state === "COMPLETE";
    const aside = (
      <>
        <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">Leave something for the village</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Turn what you just explained into a resource. The team reviews it before it is published, and you are credited.</p><Link href={`/mentor/contribute?from=${id}`} className="dc-btn dc-btn-soft mt-3 h-[48px]"><Icon name="pencil" size={17} />Draft a resource</Link></Card>
        <p className="flex gap-3 rounded-card bg-butter p-5 text-[14px] leading-normal text-butter-ink"><Icon name="clock" size={20} className="mt-px shrink-0" />Check-in in 30 days. The team asks both of you how it went. If anything felt off, tell us now.</p>
        <Link href={`/report?ask=${id}`} className="inline-flex items-center gap-2 px-2 text-[14.5px] font-bold text-bark"><Icon name="flag" size={17} />Report a concern</Link>
      </>
    );
    const thanks = av.thanks && (
      <Card className="flex flex-col gap-2 bg-blush p-5 text-blush-ink lg:p-6">
        <h2 className="font-display text-[19px] font-extrabold">From {av.thanks.from}{av.minor ? " and their guardian" : ""}</h2>
        <p className="font-display text-[19px] leading-snug">&ldquo;{av.thanks.body}&rdquo;</p>
        <p className="text-[12.5px]">Shown to you only. The team read it first.</p>
      </Card>
    );
    return (
      <MentorShell ctx={c} aside={aside} phone={{ back: "/mentor?tab=completed", title: "After the call" }} tabs={false}>
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">{done ? "Conversation complete" : "After the call"}</h1>
          <p className="mt-1 text-[16px] text-bark">{done ? `${av.topic}. Thank you, ${c.first}.` : `Thank you, ${c.first}. That was an hour well given.`}</p>
        </div>
        {done ? (
          <>
            <Card className="flex flex-col gap-2 p-5 lg:p-6">
              <h2 className="font-display text-[20px] font-extrabold">Your notes</h2>
              <p className="whitespace-pre-line text-[15px] leading-normal text-bark">{av.notes || "No notes were written."}</p>
              {av.nextSteps && <><h3 className="mt-2 text-[15px] font-extrabold">Next steps</h3><ul className="list-disc pl-5 text-[15px] text-bark">{av.nextSteps.split("\n").filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></>}
              <p className="mt-1 text-[13px] text-stone">{av.hours === 1 ? "1 hour" : `${Math.round(av.hours * 60)} minutes`} logged.</p>
            </Card>
            {thanks}
          </>
        ) : <CloseOut askId={id} minutes={Math.round(av.hours * 60)} defaultNotes={av.notes} minor={av.minor}>{thanks}</CloseOut>}
        <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
      </MentorShell>
    );
  }

  const ch = await mentorChangeView(c.userId, id);
  if (!ch) redirect("/mentor");
  return (
    <MentorShell ctx={c} phone={{ back: "/mentor?tab=scheduled", title: "Your conversation" }} tabs={false}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">{ch.topic} with {ch.participantFirst}</h1>
      {ch.needsTimes ? (
        <Card className="flex flex-col gap-2 p-5 lg:p-6">
          <p className="text-[16px] font-extrabold">{ch.missed ? "The conversation did not happen" : `${ch.participantFirst} needs a new time`}</p>
          <p className="text-[14.5px] text-bark">{ch.missed ? "Nobody is blamed and your hour isn't counted. Offer new times so it can be rebooked" : "Offer new times so it can be rebooked"}{ch.minor ? ". A guardian approves the one they pick." : "."}</p>
          <Link href={`/mentor/conversations/${id}/change`} className="dc-btn dc-btn-primary mt-2 h-[50px] self-start"><Icon name="calendar" size={18} />Offer new times</Link>
        </Card>
      ) : (
      <Card className="flex flex-col gap-2 p-5 lg:p-6">
        <p className="text-[16px] font-extrabold">{ch.start ? longWhen(ch.start) : "Waiting for a time to be chosen"}</p>
        <p className="text-[14.5px] text-bark">{ch.start ? `${ch.minutes} minutes. ${ch.minor ? "Waiting for the guardian to approve the time." : "Booked."}` : `The family is choosing one of the times you offered${ch.minor ? ", and a guardian approves it" : ""}. We will email you when it is booked.`}</p>
        <Link href={`/mentor/conversations/${id}/change`} className="mt-1 text-[14.5px] font-bold text-clay">I need to change this</Link>
      </Card>
      )}
    </MentorShell>
  );
}

const Item = ({ icon, title, body }: { icon: IconName; title: string; body: string }) => (
  <li className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-mint text-mint-ink"><Icon name={icon} size={19} /></span><span><b className="block text-[15px]">{title}</b><span className="text-[13.5px] leading-snug text-bark">{body}</span></span></li>
);
