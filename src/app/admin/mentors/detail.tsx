import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { KV, Panel, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import type { mentorApplication } from "@/lib/admin-applications-view";
import { DECLINE_REASONS, INFO_REASONS } from "@/lib/domain/admin-reasons";
import { cn } from "@/lib/cn";
import { checkAction, mentorDecisionAction } from "../applications-actions";

type App = NonNullable<Awaited<ReturnType<typeof mentorApplication>>>;
const STATE: Record<string, [string, "butter" | "mint" | "blush" | "sand"]> = { SUBMITTED: ["Pending", "butter"], IN_REVIEW: ["In review", "butter"], APPEALED: ["Appeal", "blush"], APPROVED: ["Approved", "mint"], DECLINED: ["Declined", "sand"], WITHDRAWN: ["Withdrawn", "sand"], SCREENING: ["Screening", "butter"] };
const TONES = ["butter", "mint", "blush"] as const;

/** A1 record: who they are, bio, expertise, availability, attestation, the checklist and the decision. */
export function MentorDetail({ a, canDecide, canClear }: { a: App; canDecide: boolean; canClear: boolean }) {
  const p = a.profile; const [label, tone] = STATE[a.state] ?? ["", "sand"];
  const info = a.state === "IN_REVIEW" && a.decision === "V-EVIDENCE";
  const open = ["SUBMITTED", "IN_REVIEW", "APPEALED"].includes(a.state);
  const ini = a.person.short.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const check = (item: string, labelText: string, on: boolean, disabled = false) => (
    <form action={checkAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="item" value={item} /><input type="hidden" name="on" value={on ? "0" : "1"} />
      <button type="submit" disabled={disabled} aria-pressed={on} aria-label={`${labelText}${on ? ", ticked" : ""}`} className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-check border-2 disabled:opacity-50", on ? "border-forest bg-forest text-forest-ink" : "border-line bg-card")}>{on && <Icon name="check" size={16} strokeWidth={3} />}</button>
      <span className="text-[15px]">{labelText}</span>
    </form>
  );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-[3px] border-gold bg-butter font-display text-[24px] font-extrabold text-butter-ink" aria-hidden="true">{ini}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[28px] font-extrabold leading-tight">{a.person.short}</h2><Pill tone={tone}>{info ? "More info requested" : label}</Pill></div>
          <p className="text-[15px] text-bark">{p?.seniority ? `${p.seniority}, ` : ""}{p?.expertise[0] ?? ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {a.person.country && <Pill tone="outline" icon="pin">{a.person.country}</Pill>}
            {a.person.languages.length > 0 && <Pill tone="outline" icon="globe">{a.person.languages.join(", ")}</Pill>}
            {a.submittedAt && <Pill tone="outline" icon="clock">Submitted {day(a.submittedAt)}</Pill>}
            {p?.optedForMinors && <Pill tone="blush" icon="shieldCheck">Wants to mentor under 18</Pill>}
          </div>
        </div>
      </div>

      {a.appeal && <Panel className="bg-blush text-blush-ink"><p className="text-[13px] font-extrabold uppercase tracking-[.06em]">Appeal · read by a different reviewer</p><p className="mt-1 text-[15px] font-bold">{a.appeal.kind}</p><p className="mt-1 text-[14.5px]">{a.appeal.note}</p><p className="mt-1 text-[12.5px]">Sent {day(a.appeal.at)}{a.decidedBy ? `. The first decision was made by ${a.decidedBy}.` : ""}</p></Panel>}
      {a.infoReplies.length > 0 && <Panel><p className="text-[13px] font-bold text-bark">Their reply to your question</p>{a.infoReplies.map((r) => <p key={r.at} className="mt-1.5 text-[15px]">{r.body} <span className="text-[12.5px] text-stone">({day(r.at)})</span></p>)}</Panel>}

      {p ? (
        <>
          <Panel><p className="text-[13px] font-bold text-bark">Bio · {p.bioCleared ? `cleared ${day(p.bioCleared)}${p.bioClearedBy ? ` by ${p.bioClearedBy}` : ""}` : "not yet cleared"}</p><p className="mt-1.5 text-[16px] leading-normal">{p.bio}</p></Panel>
          <Panel>
            <p className="text-[13px] font-bold text-bark">Areas of expertise</p>
            <div className="mt-2 flex flex-wrap gap-2">{p.expertise.map((e, i) => <Pill key={e} tone={TONES[i % 3]} className="text-[13.5px]">{e}</Pill>)}{p.expertiseOther && <Pill tone="outline">{p.expertiseOther}</Pill>}</div>
            {p.areas.length > 0 && <><p className="mt-3 text-[13px] font-bold text-bark">Help areas they picked</p><p className="mt-1 text-[14.5px]">{p.areas.join(", ")}</p></>}
          </Panel>
          <Panel className="py-2 lg:py-2">
            <KV rows={[
              ["Availability", `${p.monthlyHours} hour${p.monthlyHours === 1 ? "" : "s"} a month · ${p.length} minute conversations`],
              ...(p.experience ? [["Experience", p.experience] as [string, string]] : []),
              ["Résumé", p.resumeKey ? <span key="r" className="text-forest">Uploaded</span> : <Pill key="r" tone="sand">Optional</Pill>],
              ["LinkedIn", p.linkedin ? <a key="l" href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-clay">Open profile ›</a> : "Not given"],
            ]} />
          </Panel>
        </>
      ) : <Panel><p className="text-[15px] text-bark">This applicant has not finished their profile yet.</p></Panel>}

      {a.attestation && (
        <section className="rounded-card bg-mint p-5 text-mint-ink lg:p-6">
          <div className="flex flex-wrap items-center gap-3"><h3 className="flex items-center gap-2 font-display text-[20px] font-extrabold"><Icon name="shieldCheck" size={20} />Safeguarding attestation</h3><span className="flex items-center gap-1 text-[13px] font-semibold"><Icon name="check" size={14} />Signed {day(a.attestation.signedAt)}</span></div>
          <div className="mt-2 flex flex-wrap items-center gap-4"><p className="font-hand text-[34px] font-semibold leading-none">{a.attestation.name}</p><p className="max-w-[340px] text-[13px]">Typed legal name, statement version {a.attestation.version}. Not pre-ticked; confirmed by the applicant.{a.attestation.nextDue ? ` Valid until ${day(a.attestation.nextDue, { day: "numeric", month: "short", year: "numeric" })}.` : ""}</p></div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone={a.screening === "CLEAR" ? "forest" : "butter"} icon="clock">Screening: {a.screening.toLowerCase()}</Pill>
            <Pill tone={p?.orientationDone ? "forest" : "butter"} icon="clock">Orientation: {p?.orientationDone ? "done" : "pending"}</Pill>
            <Pill tone={p?.codeOfConduct ? "outline" : "butter"} icon="check">Code of Conduct: {p?.codeOfConduct ? "accepted" : "not yet"}</Pill>
          </div>
        </section>
      )}

      <Panel>
        <h3 className="font-display text-[21px] font-extrabold">Reviewer checklist</h3>
        <div className="mt-3 flex flex-col gap-3">
          {check("bio", "Bio is credible and specific", !!p?.bioCleared, !canDecide || !p)}
          {check("expertise", "Expertise is consistent with the Area of Expertise list", !!a.checklist.expertise, !canDecide)}
          {check("attestation", "Attestation present", !!a.checklist.attestation, !canDecide)}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3"><span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-check border-2", p?.cleared ? "border-forest bg-forest text-forest-ink" : "border-line")}>{p?.cleared && <Icon name="check" size={16} strokeWidth={3} />}</span><span className="text-[15px]">Cleared to be matched with participants under 18</span></span>
            {canClear && a.state === "APPROVED" && <Link href={`/admin/mentors/${a.id}/clear`} className="text-[14px] font-bold text-clay">Open ›</Link>}
          </div>
        </div>
        {a.minors && !p?.cleared && p?.optedForMinors && <p className="mt-3 text-[13px] text-stone">{a.minors.missing}</p>}
      </Panel>

      {open && canDecide ? (
        <Panel>
          <h3 className="font-display text-[21px] font-extrabold">Your decision</h3>
          <ActionForm action={mentorDecisionAction} className="mt-3" ok={{ APPROVE: "Approved. The mentor is emailed and can finish orientation.", REQUEST_INFO: "Question sent. The applicant has 14 days to reply.", DECLINE: "Declined. The applicant gets a plain message and can appeal once.", START_REVIEW: "Marked as in review." }}>
            <input type="hidden" name="id" value={a.id} />
            <div><p className="dc-label">Reason</p><Select name="reason" placeholder="Choose a reason" options={[...INFO_REASONS, ...DECLINE_REASONS].map(([v, l]) => ({ value: v, label: `${v} ${l}` }))} /><span className="dc-hint">Needed to decline or ask for more information. The applicant gets a plain message with this reason.</span></div>
            <div><label htmlFor="note" className="dc-label">Decision note</label><textarea id="note" name="note" rows={3} maxLength={1000} placeholder="Say more (optional). Required if you decline or ask for more information." className="dc-textarea" /><span className="dc-hint">Kept in the audit log, and sent with the reason. Never shown to participants.</span></div>
            <div className="flex flex-wrap gap-2.5">
              <Submit name="action" value="APPROVE" icon="check">Approve</Submit>
              {!info && a.state !== "APPEALED" && <Submit name="action" value="REQUEST_INFO" variant="soft">Request more information</Submit>}
              <Submit name="action" value="DECLINE" variant="outline">Decline</Submit>
            </div>
          </ActionForm>
        </Panel>
      ) : a.decisionNote && !open ? <Panel><p className="text-[13px] font-bold text-bark">Decision {a.decidedAt ? `on ${day(a.decidedAt)}` : ""}{a.decidedBy ? ` by ${a.decidedBy}` : ""}</p><p className="mt-1 text-[15px]">{a.decisionNote}</p></Panel> : null}

      {a.log.length > 0 && (
        <Panel>
          <h3 className="font-display text-[19px] font-extrabold">History</h3>
          <ul className="mt-2 divide-y divide-line text-[14px]">{a.log.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.action.replace(/^application\./, "").replace(/[._]/g, " ")}</span><span className="text-stone">{l.actor}, {day(l.at)}</span></li>)}</ul>
        </Panel>
      )}
    </div>
  );
}
