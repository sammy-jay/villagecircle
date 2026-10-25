import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { KV, Note, Panel, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import type { incidentDetail } from "@/lib/admin-incidents";
import { INCIDENT_OUTCOMES, INCIDENT_STATE_LABEL, SEVERITY_LABEL } from "@/lib/domain/admin-safety-1";
import { incidentMoveAction, incidentResolveAction, incidentRestoreAction } from "../safety-actions";

type I = NonNullable<Awaited<ReturnType<typeof incidentDetail>>>;
const at = (d: Date) => day(d, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** A11 record: what happened (timeline), the resolution form, and who has been told. Restricted to the safeguarding lead. */
export function IncidentDetail({ i, canAct }: { i: I; canAct: boolean }) {
  const closed = i.state === "CLOSED";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[26px] font-extrabold">#{i.ref} · <span className="capitalize">{i.categoryLabel}</span></h2>
        <div className="flex gap-2"><Pill tone={closed ? "mint" : "butter"}>{INCIDENT_STATE_LABEL[i.state]}</Pill>{i.countdown && <Pill tone={i.countdown.overdue ? "blush" : "sand"} icon="clock">{i.countdown.label}</Pill>}</div>
      </div>
      {i.restricted ? (
        <Note tone="sand" icon="lock"><b>Restricted.</b> Only the safeguarding lead, the people involved and their guardian can see this record. Other team members see that an incident exists, not what it says.</Note>
      ) : (
        <>
          <Panel>
            <h3 className="font-display text-[20px] font-extrabold">What happened</h3>
            {"description" in i && i.description && <p className="mt-2 rounded-[16px] bg-sand px-4 py-3 text-[15px] leading-normal">Reported by {i.reporterRole}: {i.description}</p>}
            <ol className="mt-3 flex flex-col">
              {i.timeline.map((e, n) => (
                <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {n < i.timeline.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%-10px)] w-0.5 bg-line" aria-hidden="true" />}
                  <span className="relative z-[1] mt-1 size-4 shrink-0 rounded-full bg-forest" aria-hidden="true" />
                  <span><b className="block text-[15px]">{e.text}</b><span className="text-[13px] text-stone">{at(e.at)}</span></span>
                </li>
              ))}
            </ol>
          </Panel>
          {i.connection && (
            <Panel className="py-2 lg:py-2">
              <KV rows={[["Participant", i.connection.participant], ["Mentor", i.connection.mentor], ["Connection", i.connection.paused ? "Paused" : "Active"], ["Evidence", `${"evidence" in i ? i.evidence : 0} item${"evidence" in i && i.evidence === 1 ? "" : "s"} locked`]]} />
            </Panel>
          )}
          {canAct && !closed && (
            <Panel>
              <h3 className="font-display text-[20px] font-extrabold">Record the resolution</h3>
              <ActionForm action={incidentResolveAction} className="mt-3" ok="Resolved. The reporter is thanked, without the details of the outcome.">
                <input type="hidden" name="id" value={i.id} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <div><p className="dc-label">Outcome</p><Select name="outcome" placeholder="Choose an outcome" options={INCIDENT_OUTCOMES.map((o) => ({ value: o, label: o }))} /></div>
                  <div><p className="dc-label">Severity</p><Select name="severity" defaultValue={i.severity} options={Object.entries(SEVERITY_LABEL).map(([value, label]) => ({ value, label }))} /></div>
                  <div className="lg:col-span-2"><p className="dc-label">Follow-up with guardian</p><Select name="followUp" defaultValue="Call within 48 hours" options={["Call within 48 hours", "Email within 48 hours", "No guardian involved"].map((x) => ({ value: x, label: x }))} /></div>
                </div>
                <div><label htmlFor="res-note" className="dc-label">Resolution note</label><textarea id="res-note" name="note" rows={3} className="dc-textarea" placeholder="Required. Kept with the evidence." /></div>
                <div className="flex flex-wrap gap-2.5">
                  <Submit icon="check">Resolve and notify</Submit>
                  {i.connection && <Link href={`/admin/accounts/${i.connection.mentorUserId}/suspend?incident=${i.id}`} className="dc-btn dc-btn-outline h-[50px]"><Icon name="pause" size={18} />Suspend mentor</Link>}
                </div>
              </ActionForm>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {i.next && i.next !== "CLOSED" && <ActionForm action={incidentMoveAction} ok="Moved on."><input type="hidden" name="id" value={i.id} /><input type="hidden" name="to" value={i.next} /><Submit variant="soft">Move to {INCIDENT_STATE_LABEL[i.next].toLowerCase()}</Submit></ActionForm>}
                {i.connection?.paused && <ActionForm action={incidentRestoreAction} ok="Connection restored." confirm="Restore this connection? The two people can be scheduled again."><input type="hidden" name="id" value={i.id} /><Submit variant="ghost">Restore the connection</Submit></ActionForm>}
              </div>
            </Panel>
          )}
          {closed && "resolution" in i && i.resolution && <Panel><p className="text-[13px] font-bold text-bark">Resolution</p><p className="mt-1 text-[15px]">{i.resolution}</p></Panel>}
        </>
      )}
    </div>
  );
}
