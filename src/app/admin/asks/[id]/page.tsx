import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { KV, Note, Panel, PanelHead, Pill, Ring, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { getReviewDetail } from "@/lib/review";
import { mentorOptions } from "@/lib/admin-asks-view";
import { ASK_FLAG_LABEL } from "@/lib/domain/ask-answers";
import { EXPERTISE } from "@/lib/domain/expertise";
import { getConfig } from "@/lib/config";
import { cn } from "@/lib/cn";
import { claimAction, decisionAction, overrideAction, rebookAction, scopeAction, shortlistAction, stepAction } from "../../asks-actions";
import { StepBar } from "./step-bar";

export const metadata = { title: "Ask review" };
export const dynamic = "force-dynamic";

const DECISIONS: [string, string][] = [
  ["ROUTE", "R-01 Ready to route: prepare the summary"], ["RETURN_FOR_INFO", "R-04 Needs a rewrite: return to the participant"], ["ANSWERED_BY_RESOURCE", "R-07 Answered by the library"],
  ["REDIRECT", "R-08 Better served elsewhere: redirect"], ["FLAG", "V-02 Safety concern: escalate"], ["NOT_PROCEEDING", "V-05 Out of scope: close kindly"],
];
const ageText = (b: string) => (b === "15" ? "Age 15" : b === "16-17" ? "Age 16 to 17" : "Adult");

/** A2 Ask review, steps A to D: completeness, safety and scope, reason code, and the ranked shortlist. Steps E and F are the composer. */
export default async function AskReview({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/asks/${params.id}`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx; const id = params.id;
  const [d, cfg] = await Promise.all([getReviewDetail(id), getConfig()]);
  if (!d) redirect("/admin/asks");
  const W = cfg.weights;
  const triage = c.perms.includes("asks.triage"); const release = c.perms.includes("asks.release");
  const inReview = d.ask.state === "IN_TEAM_REVIEW";
  const mine = d.review?.reviewerId === c.userId;
  const done = d.review?.stepsDone ?? [];
  const opts = release && inReview ? await mentorOptions(d.participant.minor) : [];
  const flags = [...new Set([...d.flags, ...d.liveFlags])];
  const stepped = d.shortlist.filter((s) => s.response === "STEPPED_FORWARD");

  const conn = d.connection;
  const canRebook = inReview && release && !!conn && ["CANCELLED", "MISSED"].includes(conn.status) && !conn.held;
  const aside = (
    <>
      {canRebook && (
        <Panel className="border-2 border-clay">
          <h2 className="font-display text-[21px] font-extrabold">The last conversation did not happen</h2>
          <p className="mt-1.5 text-[14px] leading-normal text-bark">{conn!.attendance === "MENTOR_ABSENT" ? `${conn!.mentorFirst} did not join.` : conn!.attendance === "PARTICIPANT_ABSENT" ? `${conn!.mentorFirst} was there; the participant did not join.` : conn!.attendance === "NEITHER" ? "Neither of them joined." : `${conn!.mentorFirst} handed it back.`} Rebook with {conn!.mentorFirst}, or build a new shortlist below.</p>
          <ActionForm action={rebookAction} className="mt-3" hideOnOk ok={`Rebooked. ${conn!.mentorFirst} is asked for new times, and everyone is told.`}
            confirm={{ title: `Rebook with ${conn!.mentorFirst}?`, body: `${conn!.mentorFirst} is asked to offer new times. The participant picks one${d.participant.minor ? " and the guardian approves it" : ""}.`, confirmLabel: "Rebook" }}>
            <input type="hidden" name="askId" value={id} />
            {conn!.mentorActive ? <Submit variant="forest" icon="calendar">Rebook with {conn!.mentorFirst}</Submit> : <p className="text-[14px] font-semibold text-clay">{conn!.mentorFirst}&apos;s account is not active, so find another mentor.</p>}
          </ActionForm>
        </Panel>
      )}
      {inReview && (release || triage) && (
        <Panel>
          <h2 className="font-display text-[21px] font-extrabold">Reason code</h2>
          <ActionForm action={decisionAction} className="mt-2" ok={{ RETURN_FOR_INFO: "Returned. The participant sees your note and has 14 days.", ANSWERED_BY_RESOURCE: "Closed as answered by the library.", REDIRECT: "Redirected with your note.", FLAG: "Escalated to a senior reviewer.", NOT_PROCEEDING: "Closed kindly with your note." }}>
            <input type="hidden" name="askId" value={id} />
            <div><p className="dc-label">Pick one</p><Select name="decision" defaultValue="ROUTE" options={DECISIONS.filter(([v]) => release || v === "FLAG" || v === "ROUTE").map(([value, label]) => ({ value, label }))} sayMore={{ name: "note", placeholder: "Say more (the participant reads it when an Ask is returned or closed)", show: "always" }} /></div>
            <p className="text-[12.5px] text-stone">R- codes route or return an Ask. V- codes end it. Every code sends a plain message to the participant.</p>
            <Submit variant="forest" icon="arrowRight">Apply</Submit>
          </ActionForm>
        </Panel>
      )}
      <section className="rounded-card bg-butter p-5 text-butter-ink">
        <p className="text-[13px] font-bold">Summary preview (what the mentor will see)</p>
        <p className="mt-1.5 font-display text-[19px] font-extrabold">{d.ask.topic} · {d.review?.sessionLength ?? 30} min · {ageText(d.participant.ageBand)}</p>
        <p className="mt-1.5 text-[14.5px] leading-normal">{d.review?.summary ? `${d.review.summary.question} ${d.review.summary.whatWouldHelp}` : "Not written yet. Prepare it in step E."}</p>
        <p className="mt-2 text-[12.5px]">Names, school, location and contact details removed.{d.guardian?.attends ? " Guardian will attend." : ""}</p>
        {release && inReview && <Link href={`/admin/asks/${id}/compose`} className="mt-3 inline-block text-[14px] font-bold">Open the composer ›</Link>}
      </section>
      {d.participant.minor && (
        <section className="rounded-card bg-mint p-5 text-mint-ink">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-extrabold"><Icon name="shieldCheck" size={19} />Guardian and scheduling</h2>
          <p className="mt-1.5 text-[14px] leading-normal">{d.authorizedAt ? `Guardian authorized this Ask on ${day(d.authorizedAt)}.` : "Waiting for the guardian to authorize this Ask."} After a mentor steps forward, the guardian approves the mentor and the time.</p>
          {d.connection && <Link href={`/admin/asks/${id}/step-forward`} className="dc-btn dc-btn-outline mt-3 h-11 w-full border-mint-ink/30"><Icon name="calendar" size={17} />Facilitate scheduling</Link>}
        </section>
      )}
      <Link href={`/admin/playbook?ask=${id}`} className="px-1 text-[14px] font-bold text-clay">Reviewer playbook for this step ›</Link>
      <Link href={`/admin/asks/${id}/record`} className="px-1 text-[14px] font-bold text-clay">Full record and history ›</Link>
    </>
  );

  return (
    <AdminShell ctx={c} aside={aside} phone={{ back: "/admin/asks", title: "Ask review" }}>
      <AdminHead eyebrow="Asks" title="Ask review" sub={`${d.ask.topic} · ${d.review?.sessionLength ?? d.answers.sessionLength ?? 30} min · ${ageText(d.participant.ageBand)}`} />
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="mint" icon="eye">A team member reads every Ask before any mentor sees it</Pill>
        {d.ask.due && <Pill tone="sand" icon="clock">Window {day(d.ask.due, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Pill>}
        {!inReview && <Pill tone="butter">{d.ask.state.toLowerCase().replace(/_/g, " ")}</Pill>}
        {inReview && !mine && triage && <form action={claimAction}><input type="hidden" name="askId" value={id} /><button type="submit" className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] font-bold">{d.review?.reviewerId ? "Take over this review" : "Claim this review"}</button></form>}
        {mine && <Pill tone="outline" icon="user">You are reviewing</Pill>}
      </div>
      <StepBar askId={id} done={done} editable={inReview && triage} action={stepAction} />

      <Panel>
        <PanelHead title="Step A. Read what the participant wrote" />
        <dl className="flex flex-col gap-3 text-[15px]">
          {([["Their question", d.answers.q1], ["What they have tried", d.answers.q2], ["What would help", d.answers.q3]] as const).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-[13px] font-bold text-bark">{k}</dt><dd className="mt-0.5 leading-normal">{v}</dd></div>)}
        </dl>
        <p className="mt-3 text-[12.5px] text-stone">Visible to the team{d.participant.minor ? " and the guardian" : ""} only. {d.participant.first}, {ageText(d.participant.ageBand).toLowerCase()}{d.participant.age != null ? ` (${d.participant.age})` : ""}.</p>
      </Panel>

      <Panel>
        <PanelHead title="Step B. Screen the content" />
        {flags.length ? <div className="flex flex-wrap gap-2">{flags.map((f) => <Pill key={f} tone="blush" icon="alert">{ASK_FLAG_LABEL[f]}</Pill>)}</div> : <p className="text-[14.5px] text-bark">No content flags found. Read it once more with care.</p>}
        <p className="mt-2 text-[12.5px] text-stone">Any flag freezes the Ask and escalates it. It never reaches a mentor.</p>
        {inReview && triage && (
          <ActionForm action={scopeAction} className="mt-4 border-t border-line pt-4" ok="Saved.">
            <input type="hidden" name="askId" value={id} />
            <div><p className="dc-label">Step D. Expertise needed</p>
              <div className="flex flex-wrap gap-1.5">{EXPERTISE.map(([v, l]) => <label key={v} className="cursor-pointer"><input type="checkbox" name="expertise" value={v} defaultChecked={d.review?.expertiseNeeded.includes(v)} className="peer sr-only" /><span className="inline-block rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold peer-checked:bg-forest peer-checked:text-forest-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">{l}</span></label>)}</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="dc-label">Conversation length</p><Select name="sessionLength" defaultValue={String(d.review?.sessionLength ?? d.answers.sessionLength ?? 30)} options={[{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }]} /></div>
              <div><label htmlFor="withheld" className="dc-label">Extra words to keep out (comma separated)</label><input id="withheld" name="withheld" defaultValue={(d.review?.withheld ?? []).join(", ")} placeholder="A school, a town, an employer" className="dc-input" /></div>
            </div>
            <Submit variant="soft" className="self-start">Save scope</Submit>
          </ActionForm>
        )}
      </Panel>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-[26px] font-extrabold">Shortlist, ranked</h2><p className="text-[12.5px] text-stone">Fit {W.fit} · capacity {W.capacity} · spread {W.spread} · affinity {W.affinity} · responsiveness {W.responsiveness}</p></div>
        <p className="mt-1 text-[14px] text-bark">{d.participant.minor ? "Mentors who are not cleared for minors are excluded before scoring." : "Mentors who are paused or at their hours are excluded before scoring."}</p>
      </section>
      {d.shortlist.length ? (
        <ul className="flex flex-col gap-3">
          {d.shortlist.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-4 lg:px-5">
              <Ring pct={s.score} size={60} color={s.score >= 80 ? "#1F4733" : s.score >= 70 ? "#4B3A08" : "#6E2A14"} />
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-extrabold">{s.name}{s.rank === 0 && <span className="ml-2 text-[12.5px] font-semibold text-clay">Override</span>}</p>
                <p className="text-[13.5px] text-bark">{s.headline}. {s.hoursGiven} of {s.monthlyHours} hours used this month{s.reason ? `. ${s.reason}` : ""}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{s.minorsOk && <Pill tone="mint" icon="shieldCheck">Cleared for minors</Pill>}{s.releasedAt && <Pill tone="butter">Released {day(s.releasedAt)}</Pill>}{s.response === "STEPPED_FORWARD" && <Pill tone="forest" icon="check">Stepped forward</Pill>}{s.response === "PASSED" && <Pill tone="sand">Passed</Pill>}{s.response === "REFERRED_ON" && <Pill tone="sand">Suggested a colleague</Pill>}</div>
              </div>
              {s.response === "STEPPED_FORWARD" && release && <Link href={`/admin/asks/${id}/step-forward`} className="dc-btn dc-btn-primary h-12"><Icon name="check" size={18} />Confirm mentor</Link>}
            </li>
          ))}
        </ul>
      ) : <Note tone="sand" icon="users">{inReview ? "No shortlist yet. Build it once the scope is set." : "No shortlist was built for this Ask."}</Note>}
      {inReview && triage && (
        <div className="flex flex-wrap gap-2.5">
          <ActionForm action={shortlistAction} ok={{ built: "Shortlist updated.", empty: "Nobody new is eligible. Try widening, or hand-match." }}><input type="hidden" name="askId" value={id} /><Submit variant={d.shortlist.length ? "soft" : "forest"} icon="refresh">{d.shortlist.length ? "Add more to the shortlist" : "Build the shortlist"}</Submit></ActionForm>
          <Link href={`/admin/asks/${id}/hand-match`} className="dc-btn dc-btn-outline h-[50px]">Nobody fits? Hand-match</Link>
          {stepped.length > 0 && <Link href={`/admin/asks/${id}/step-forward`} className="dc-btn dc-btn-primary h-[50px]">{stepped.length} stepped forward</Link>}
        </div>
      )}
      {!inReview && stepped.length > 0 && release && <Link href={`/admin/asks/${id}/step-forward`} className="dc-btn dc-btn-primary h-[50px] self-start">{stepped.length} stepped forward: choose who takes it</Link>}
      {release && inReview && opts.length > 0 && (
        <Panel>
          <PanelHead title="Override the order?" />
          <p className="text-[14px] text-bark">Pick a different mentor and add a note. The override and note are kept in the audit log.</p>
          <ActionForm action={overrideAction} className="mt-3" ok="Added to the top of the shortlist.">
            <input type="hidden" name="askId" value={id} />
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="dc-label">Mentor</p><Select name="mentorId" placeholder="Choose a mentor" options={opts} /></div>
              <div><p className="dc-label">Why override?</p><Select name="why" placeholder="Choose a reason" options={["Knows this exact path", "Speaks the participant's language", "Better availability this week", "Something else"].map((x) => ({ value: x, label: x }))} /></div>
            </div>
            <input name="note" placeholder="Note for the audit log (required to override)" aria-label="Note for the audit log" className="dc-saymore" />
            <Submit variant="soft" className="self-start">Override with a note</Submit>
          </ActionForm>
        </Panel>
      )}
      {d.connection && <Panel className="py-2 lg:py-2"><KV rows={[["Connection", d.connection.status.toLowerCase()], ["Guardian approved mentor", d.connection.mentorApproved ? day(d.connection.mentorApproved) : d.participant.minor ? "Waiting" : "Not needed"], ["Guardian approved time", d.connection.timeApproved ? day(d.connection.timeApproved) : d.participant.minor ? "Waiting" : "Not needed"], ["Scheduled", d.connection.scheduledAt ? day(d.connection.scheduledAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not yet"]]} /></Panel>}
      <div className={cn("flex flex-col gap-4 lg:hidden")}>{aside}</div>
    </AdminShell>
  );
}
