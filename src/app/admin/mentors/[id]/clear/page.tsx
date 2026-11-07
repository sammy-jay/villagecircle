import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { mentorApplication } from "@/lib/admin-applications-view";
import { cn } from "@/lib/cn";
import { checkAction, clearMinorsAction, orientationRecordAction, remindAction, screeningAction } from "../../../applications-actions";
import { SignOff } from "./sign-off";

export const metadata = { title: "Clear for under-18" };
export const dynamic = "force-dynamic";

const DECLINE = ["Screening result needs a conversation first", "Orientation not completed", "Not the right fit for young adults yet", "Something else"];

/** A32 Clear for under-18: the five requirements, what only the mentor can do, what the team records, and the reviewer's signed sign-off. */
export default async function ClearMinors({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/mentors/${params.id}/clear`, "minors.clear");
  if ("to" in r) redirect(r.to);
  const a = await mentorApplication(params.id);
  if (!a || !a.profile || !a.minors) redirect(`/admin/mentors/${params.id}`);
  const p = a.profile; const items = a.minors.items;
  const left = items.filter((i) => !i.done).length;
  const detail: Record<string, string> = {
    optIn: p.optedForMinors ? "The mentor chose this from Profile and privacy." : "The mentor has not opted in. Only they can do this.",
    screening: a.screening === "CLEAR" ? `Recorded as clear${a.screeningRef ? `. Reference ${a.screeningRef}` : ""}.` : a.screening === "CONSIDER" ? "The provider returned a result to discuss. A person decides; it never auto-declines." : a.screening === "PENDING" ? "In progress with the provider." : "Not started.",
    orientation: p.orientationDone ? `Completed ${day(p.orientationDone)}.` : "Record the date and a short note, or send the mentor a reminder.",
    conduct: p.codeOfConduct ? `Accepted by the mentor on ${day(p.codeOfConduct)}. Only the mentor can do this.` : "Not accepted yet. Only the mentor can do this.",
    attestation: a.attestation?.nextDue ? `Signed ${day(a.attestation.signedAt)}, valid until ${day(a.attestation.nextDue, { day: "numeric", month: "short", year: "numeric" })}. Only the mentor can sign it.` : "Not signed. Only the mentor can sign it.",
  };
  return (
    <AdminShell ctx={r.ctx} phone={{ back: `/admin/mentors/${a.id}`, title: "Clear for under-18" }}>
      <AdminHead eyebrow="Applications · Mentors" title={`Clear ${a.person.short} for under-18`} sub="All five are needed. The mentor opts in, accepts the Code of Conduct and signs the attestation. The team records screening and orientation." right={<Pill tone={p.cleared ? "mint" : "butter"}>{p.cleared ? "Cleared" : p.requested ? "Mentor asked to be cleared" : "Not cleared"}</Pill>} />
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Reviewer checklist</h2>
        <p className="text-[13.5px] text-stone">Ticks are saved, so they are still there when you come back.</p>
        <div className="mt-3 flex flex-col gap-3">
          {([["bio", "Bio is credible and specific", !!p.bioCleared], ["expertise", "Expertise is consistent with the Area of Expertise list", !!a.checklist.expertise]] as const).map(([item, l, on]) => (
            <form key={item} action={checkAction} className="flex items-center gap-3"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="item" value={item} /><input type="hidden" name="on" value={on ? "0" : "1"} />
              <button type="submit" aria-pressed={on} aria-label={l} className={cn("flex size-[30px] items-center justify-center rounded-check border-2", on ? "border-forest bg-forest text-forest-ink" : "border-line")}>{on && <Icon name="check" size={16} strokeWidth={3} />}</button><span className="text-[15px]">{l}</span></form>
          ))}
          {p.bioCleared && <p className="text-[13px] text-stone">Bio cleared {day(p.bioCleared)}{p.bioClearedBy ? ` by ${p.bioClearedBy}` : ""}. Editing the bio clears this again.</p>}
        </div>
      </Panel>
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Before clearing for under 18</h2>
        <ul className="mt-2 divide-y divide-line">
          {items.map((i) => (
            <li key={i.key} className="flex items-start gap-3 py-3.5">
              <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", i.done ? "bg-forest text-forest-ink" : "border-2 border-dashed border-line")}>{i.done && <Icon name="check" size={16} />}</span>
              <span className="min-w-0 flex-1"><b className="block text-[15.5px]">{i.label}</b><span className="text-[13.5px] text-bark">{detail[i.key]}</span></span>
              <Pill tone={i.done ? "mint" : "blush"}>{i.done ? "Done" : "Outstanding"}</Pill>
            </li>
          ))}
        </ul>
        {left > 0 && <ActionForm action={remindAction} ok="Reminder sent to the mentor." className="mt-2"><input type="hidden" name="id" value={a.id} /><Submit variant="soft" icon="bell" className="self-start">Send reminder</Submit></ActionForm>}
      </Panel>
      {a.screening !== "CLEAR" && (
        <Panel>
          <h2 className="font-display text-[21px] font-extrabold">Record screening</h2>
          <ActionForm action={screeningAction} ok="Screening recorded." className="mt-2">
            <input type="hidden" name="id" value={a.id} />
            <div><p className="dc-label">Result</p><Select name="state" options={[{ value: "CLEAR", label: "Clear" }, { value: "CONSIDER", label: "Consider (needs a conversation)" }, { value: "PENDING", label: "Still pending" }]} /></div>
            <div><label htmlFor="sc-note" className="dc-label">Reference or note (10 characters or more)</label><input id="sc-note" name="note" className="dc-input" placeholder="Provider reference, or how it was checked" /></div>
            <Submit variant="forest" className="self-start">Save screening</Submit>
          </ActionForm>
        </Panel>
      )}
      {!p.orientationDone && (
        <Panel>
          <h2 className="font-display text-[21px] font-extrabold">Record orientation</h2>
          <ActionForm action={orientationRecordAction} ok="Orientation recorded." className="mt-2">
            <input type="hidden" name="id" value={a.id} />
            <div className="grid gap-3 lg:grid-cols-3">
              <div><label htmlFor="o-date" className="dc-label">Date held</label><input id="o-date" name="date" type="date" className="dc-input" /></div>
              <div><p className="dc-label">Format</p><Select name="format" defaultValue="Live group session" options={["Live group session", "One to one call", "Recorded modules and quiz"].map((x) => ({ value: x, label: x }))} /></div>
              <div><p className="dc-label">Run by</p><Select name="ranBy" defaultValue="Safeguarding lead" options={["Safeguarding lead", "Program lead", "Reviewer"].map((x) => ({ value: x, label: x }))} /></div>
            </div>
            <div><label htmlFor="o-note" className="dc-label">Note (10 characters or more)</label><textarea id="o-note" name="note" rows={2} className="dc-textarea" placeholder="Who ran it and what was covered" /></div>
            <Submit variant="forest" className="self-start">Save orientation</Submit>
          </ActionForm>
        </Panel>
      )}
      {p.cleared ? <Note tone="mint" icon="shieldCheck">{a.person.short} is cleared to be matched with participants under 18.</Note> : (
        <Panel>
          <h2 className="font-display text-[21px] font-extrabold">Reviewer sign-off</h2>
          <p className="text-[14px] text-bark">Sign when all five are done. This is stored with your name, the date and the time.</p>
          <SignOff id={a.id} left={left} action={clearMinorsAction} declineReasons={DECLINE} />
        </Panel>
      )}
      <Note tone="butter" icon="shieldCheck"><b>Safeguarding:</b> the team cannot accept the Code of Conduct or sign the attestation for a mentor. Screening and orientation are logged with who recorded them and when.</Note>
    </AdminShell>
  );
}
