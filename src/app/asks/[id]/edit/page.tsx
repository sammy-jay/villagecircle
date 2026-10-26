import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { WizardSteps } from "@/components/app/ask-kit";
import { topicLook } from "@/components/app/topic-look";
import { participantPage } from "@/lib/participant-ctx";
import { getOwnAsk, listTopics, resourcesForTopic } from "@/lib/asks";
import { MAX_OPEN_ASKS } from "@/lib/domain/limits";
import { PROMPTS, completeness, promptDone } from "@/lib/domain/ask-answers";
import { db } from "@/lib/db";
import { answeredAction } from "@/app/asks/actions";
import { cn } from "@/lib/cn";
import { EditLink, SendForm, TellAside, TellStep, TopicStep } from "./steps";
import { DeleteDraft } from "../../delete-draft";

export const metadata = { title: "New Ask" };
export const dynamic = "force-dynamic";

const STEPS = ["topic", "tell", "read", "send"] as const;
type Step = (typeof STEPS)[number];
const SOON_LABEL: Record<string, string> = { week: "Within a week", month: "Within a month", term: "This term", flexible: "No rush" };

/**
 * The Ask wizard: D10 Topic, D2 Tell us, D11 Read first, D12 Send. `/asks/start/edit` begins at the topic with no draft yet.
 * A returned Ask (EX5) reuses the tell and send steps.
 */
export default async function EditAsk({ params, searchParams }: { params: { id: string }; searchParams: { step?: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/asks/new" : r.to);
  const c = r.ctx;
  const fresh = params.id === "start";
  const own = fresh ? null : await getOwnAsk(c.userId, params.id);
  if (!fresh && !own) redirect("/asks");
  if (own && own.ask.state !== "DRAFT" && !own.ask.returnedForDetail) redirect(`/asks/${params.id}`);
  const step: Step = fresh ? "topic" : (STEPS as readonly string[]).includes(searchParams.step ?? "") ? (searchParams.step as Step) : "tell";
  const idx = STEPS.indexOf(step);

  const topics = (await listTopics()).filter((t) => t.active && !t.later);
  const opts = topics.map((t) => ({ value: t.slug, label: t.name }));
  const prof = await db.participantProfile.findUnique({ where: { userId: c.userId } });
  const open = c.openCount + (own && own.ask.state === "DRAFT" ? 0 : 0);
  const guardian = c.minor ? await db.guardianLink.findFirst({ where: { active: true, participantId: prof?.id }, include: { guardian: { include: { user: true } } } }) : null;
  const gName = guardian?.guardian.user.name;

  const a = own?.ask.answers;
  const back = fresh ? "/home" : step === "topic" ? "/asks" : `/asks/${params.id}/edit?step=${STEPS[idx - 1]}`;
  const draftNote = (
    <div className="flex flex-col items-center gap-2">
      <p className="text-center text-[12.5px] text-stone">Draft saved. It waits for 30 days.</p>
      {own?.ask.state === "DRAFT" && <DeleteDraft askId={own.ask.id} className="text-[13px]" />}
    </div>
  );
  const minorNote = c.minor && (
    <div className="flex gap-3 rounded-[20px] bg-mint px-4 py-3.5 text-[13.5px] leading-[1.45] text-mint-ink">
      <Icon name="shieldCheck" size={22} className="shrink-0" />
      <p><b>You are under 18,</b> {step === "send" ? "nothing reaches a mentor until your guardian and the team both say yes." : "so your last step goes to your guardian to approve. A team member reads it first."}</p>
    </div>
  );
  const openCard = (extra = 0) => {
    const n = Math.min(MAX_OPEN_ASKS, open + extra);
    return (
      <Card className="flex flex-col gap-[9px] p-[18px]">
        <div className="flex items-center gap-2"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Open Asks</h2><span className="ml-auto font-display text-[20px] font-extrabold">{n} of {MAX_OPEN_ASKS}</span></div>
        <div className="h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full rounded-[inherit] bg-forest" style={{ width: `${(n / MAX_OPEN_ASKS) * 100}%` }} /></div>
        <p className="text-[13.5px] leading-normal text-bark">{n >= MAX_OPEN_ASKS ? (extra ? "This will be your last open Ask for now. To start another, finish or close one." : "You are at the limit. Finish or close one to start another.") : n === MAX_OPEN_ASKS - 1 ? "You have room for one more." : "You can have up to three open Asks at once."}</p>
      </Card>
    );
  };

  let body: React.ReactNode; let aside: React.ReactNode;
  const head = (eyebrow: string, title: string, lead: string) => (
    <div>
      <p className="text-[12.5px] font-extrabold tracking-[.04em] text-clay lg:text-[13px]">{eyebrow}</p>
      <h1 className="mt-1.5 font-display text-[32px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">{title}</h1>
      <p className="mt-1.5 text-[15.5px] leading-normal text-bark lg:text-[16px]">{lead}</p>
    </div>
  );

  if (step === "topic") {
    const big = topics.slice(0, 6).map((t) => ({ slug: t.slug, name: t.name, ...topicLook(t.slug, t.name) }));
    const more = topics.slice(6).map((t) => ({ value: t.slug, label: t.name }));
    const cur = own ? topics.find((t) => t.name === own.ask.topic)?.slug : undefined;
    body = <>{head(fresh ? "NEW ASK" : "STEP 1 OF 4", "What is this about?", "Pick the closest one. Do not worry about getting it perfect. You will tell us more on the next step.")}<TopicStep askId={own?.ask.id} topics={big} more={more} current={cur} /></>;
    aside = (
      <>
        <Card className="flex flex-col gap-2.5 p-[18px]">
          <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">How mentors see it</h2>
          <p className="text-[12.5px] text-stone">Only after the team has read it</p>
          <div className="flex items-center gap-2.5"><span className="flex size-[38px] items-center justify-center rounded-full bg-sand font-display text-[14px] font-bold text-stone">?</span><div className="text-[14px]"><b>A student{c.minor ? ", 15 to 17" : ""}</b><p className="text-[12.5px] text-stone">No name. No school.</p></div></div>
          {a?.q1 && <p className="line-clamp-3 text-[14px] leading-normal text-bark">{a.q1}</p>}
        </Card>
        {openCard()}
        {minorNote}{draftNote}
      </>
    );
  } else if (step === "tell" && own && a) {
    body = <>{head(`TOPIC: ${own.ask.topic.toUpperCase()}`, "Tell us what you need", "A few honest sentences are enough. Please do not put phone numbers, emails or social handles. We take out names and school details before a mentor sees it.")}<TellStep askId={own.ask.id} a={a} topics={opts} topicSlug={own.topicSlug} /></>;
    aside = (
      <>
        <TellAside initial={{ pct: completeness({ q1: a.q1, q2: a.q2, q3: a.q3 }, true), done: PROMPTS.map((p) => promptDone(a[p.key])) }} />
        <Card className="flex flex-col gap-[9px] p-5">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Not sure what to write?</h2>
          <p className="text-[13.5px] leading-normal text-bark">Try a starter and change the words:</p>
          <p className="rounded-saymore bg-butter px-3 py-2.5 text-[14px] leading-[1.4] text-butter-ink">I would like to understand what a typical week looks like in...</p>
          <p className="rounded-saymore bg-mint px-3 py-2.5 text-[14px] leading-[1.4] text-mint-ink">I am choosing between... and want to talk it through.</p>
        </Card>
        {minorNote}{draftNote}
      </>
    );
  } else if (step === "read" && own && a) {
    const reads = await resourcesForTopic(own.topicSlug);
    const tones = ["butter", "mint", "blush"] as const;
    body = (
      <>
        {head("READ FIRST", "The village may already have an answer", "These come closest to your question. Take a look before you send. It can save everyone an hour, and nothing you wrote is lost.")}
        {reads.length ? reads.map((x, i) => (
          <Card key={x.id} className="flex items-center gap-4 p-[18px]">
            <span className={cn("flex size-[52px] shrink-0 items-center justify-center rounded-[16px]", PASTEL[tones[i % 3]].both)}><Icon name={(x.type === "EVENT_RECORDING" || x.type === "VIDEO") ? "play" : x.type === "TEMPLATE" ? "doc" : "book"} size={24} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold tracking-[.05em] text-clay">{x.type.replace("EVENT_", "").replace("ARTICLE", "ANSWER")}</p>
              <p className="font-display text-[18px] font-extrabold leading-[1.15]">{x.title}</p>
              <p className="mt-0.5 text-[13px] text-stone">{own.ask.topic}{x.reviewed && ` · Reviewed ${new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(x.reviewed)}`}</p>
            </div>
            <Link href={`/village/library/${x.id}`} target="_blank" className="dc-btn dc-btn-soft h-11 shrink-0 px-[18px] max-lg:hidden">{(x.type === "EVENT_RECORDING" || x.type === "VIDEO") ? "Watch" : "Read it"}</Link>
          </Card>
        )) : <Card className="p-5 text-[15px] text-bark">Nothing in the library matches yet. Carry on and a mentor will help.</Card>}
        <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Did one of these answer it?</h2>
          {reads.length > 0 && (
            <form action={answeredAction}>
              <input type="hidden" name="askId" value={own.ask.id} />
              <button type="submit" className="flex w-full items-start gap-3 rounded-field border-2 border-line p-4 text-left">
                <Icon name="check" size={22} className="mt-0.5 shrink-0 text-forest" />
                <span><span className="block text-[15.5px] font-bold">Yes, close my Ask as answered</span><span className="mt-0.5 block text-[13.5px] text-stone">No mentor time is used. It is saved as Answered by resource, and you can reopen it any time.</span></span>
              </button>
            </form>
          )}
          <Link href={`/asks/${own.ask.id}/edit?step=send`} className="flex items-start gap-3 rounded-field border-2 border-forest bg-mint/40 p-4">
            <Icon name="arrowRight" size={22} className="mt-0.5 shrink-0 text-forest" />
            <span><span className="block text-[15.5px] font-bold">Not quite. I still want to ask</span><span className="mt-0.5 block text-[13.5px] text-stone">Nothing is lost. Your answers move on to the final review.</span></span>
          </Link>
        </section>
        <div className="flex items-center justify-between pb-7 max-lg:hidden">
          <Link href={back} className="dc-btn dc-btn-soft h-[52px]"><Icon name="chevronLeft" size={18} />Back</Link>
          <Link href={`/asks/${own.ask.id}/edit?step=send`} className="dc-btn dc-btn-primary h-[52px]"><Icon name="arrowRight" size={18} />Continue to review</Link>
        </div>
        <div className="h-[104px] lg:hidden" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden"><Link href={`/asks/${own.ask.id}/edit?step=send`} className="dc-btn dc-btn-primary h-14 w-full">Continue to review</Link></div>
      </>
    );
    aside = (
      <>
        <Card className="flex flex-col gap-2.5 p-[18px]">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your Ask so far</h2><EditLink href={`/asks/${own.ask.id}/edit?step=tell`} /></div>
          <p className="font-display text-[17px] font-bold leading-[1.3]">&ldquo;{a.q1}&rdquo;</p>
          <div className="flex flex-wrap gap-1.5">{[own.ask.topic, a.stage, `${a.sessionLength} min`].filter(Boolean).map((t) => <span key={t} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{t}</span>)}</div>
        </Card>
        <section className="rounded-card bg-butter p-5 text-butter-ink">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Why read first?</h2>
          <p className="mt-2 text-[13.5px] leading-normal">Mentors give their own time for free. If a tip already covers your question, you get your answer today and their hour goes to someone else.</p>
        </section>
        {minorNote}
      </>
    );
  } else if (own && a) {
    const details: [string, string, string][] = [
      ["Topic", own.ask.topic, "topic"], ["Where you are now", a.stage ?? "Not given", "tell"],
      ["How soon", [SOON_LABEL[a.soon ?? ""] ?? "No rush", a.soonMore].filter(Boolean).join(". "), "tell"],
      ["Call length", `${a.sessionLength} minutes, on video`, "tell"], ["Mentor type", a.mentorType ?? "No preference", "tell"],
    ];
    const chars = `${a.q1}${a.q2}${a.q3}`.length;
    const next: [string, string][] = [
      ...(c.minor ? [["Your guardian says yes", `${gName ?? "Your guardian"} gets an email now. Usually within 2 days.`] as [string, string]] : []),
      ["The team reads it", "Within 2 working days. They may suggest a small edit."], ["A mentor steps forward", "Usually 3 to 5 days. You will get a notification."],
      ["You pick a time", c.minor ? "Your guardian approves it." : "From the times your mentor offers."],
    ];
    body = (
      <>
        {head("LAST STEP", "Check it, then send", c.minor ? "Read it once more as if you were the mentor. Your guardian sees exactly this." : "Read it once more as if you were the mentor.")}
        <SendForm askId={own.ask.id} minor={c.minor} a={a}>
          <Card className="flex flex-col gap-3 p-5 lg:p-[22px]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-11 items-center justify-center rounded-full bg-blush font-display text-[16px] font-bold text-blush-ink">{c.first.charAt(0)}</span>
              <div><p className="text-[15px] font-bold">Asking as {c.first}</p><p className="flex items-center gap-[5px] text-[12.5px] text-stone"><Icon name="lock" size={13} />Private. Mentors never see your name.</p></div>
            </div>
            <p className="font-display text-[22px] font-bold leading-[1.25] tracking-[-.01em]">{a.q1}</p>
            {a.q2 && <p className="text-[15px] leading-normal text-bark"><b className="text-ink">Where I am now.</b> {a.q2}</p>}
            {a.q3 && <p className="text-[15px] leading-normal text-bark"><b className="text-ink">What would help most.</b> {a.q3}</p>}
            <p className="text-right text-[12.5px] text-stone">{chars} characters. Names and school details are taken out.</p>
          </Card>
          <Card className="p-5 lg:p-[22px] max-lg:hidden">
            <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Your details</h2>
            <dl className="mt-2">
              {details.map(([k, v, s], i) => (
                <div key={k} className={cn("flex items-center gap-4 py-3", i > 0 && "border-t border-line")}>
                  <dt className="w-40 shrink-0 text-[13.5px] font-bold text-bark">{k}</dt><dd className="min-w-0 flex-1 text-[15px]">{v}</dd><EditLink href={`/asks/${own.ask.id}/edit?step=${s}`} />
                </div>
              ))}
            </dl>
          </Card>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-card bg-mint p-[18px] text-mint-ink">
              <h3 className="font-display text-[17px] font-extrabold">A mentor will see</h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">{["Your topic and your answers, with names and school details removed", c.minor ? "Your age band, 15 to 17" : "That you are 18 or over", "Your call length and time frame"].map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0" />{x}</li>)}</ul>
            </section>
            <section className="rounded-card bg-blush p-[18px] text-blush-ink">
              <h3 className="font-display text-[17px] font-extrabold">A mentor never sees</h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">{["Your name or last name", "Your school or address", "Any phone number, email or handle"].map((x) => <li key={x} className="flex gap-2"><Icon name="x" size={16} className="mt-0.5 shrink-0" />{x}</li>)}</ul>
            </section>
          </div>
        </SendForm>
      </>
    );
    aside = (
      <>
        <Card className="p-[18px]">
          <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
          <ol className="mt-3.5 flex flex-col gap-3.5">
            {next.map(([t, s], i) => (
              <li key={t} className="flex items-start gap-3">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[16px] font-extrabold", PASTEL[(["butter", "mint", "blush", "butter"] as const)[i]!].both)}>{i + 1}</span>
                <div><p className="text-[15px] font-extrabold">{t}</p><p className="mt-px text-[13.5px] text-stone">{s}</p></div>
              </li>
            ))}
          </ol>
        </Card>
        {openCard(own.ask.state === "DRAFT" ? 1 : 0)}
        {minorNote}{draftNote}
      </>
    );
  } else redirect("/asks");

  return (
    <ParticipantShell ctx={{ name: c.name, openCount: c.openCount, unread: c.unread }} aside={aside} tabs={false}
      phone={{ back, title: "New Ask", right: !fresh && step !== "send" ? <Link href="/asks" className="text-[14.5px] font-extrabold text-clay">Save</Link> : undefined }}>
      <WizardSteps current={idx} />
      {body}
    </ParticipantShell>
  );
}
