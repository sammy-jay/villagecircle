import Link from "next/link";
import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { askRecord } from "@/lib/admin-all-asks";
import { STATE_LABEL } from "@/lib/domain/ask-tracking";
import { REASON_LABEL } from "@/lib/review-labels";
import { recordIssueAction } from "../../../asks-actions";

export const metadata = { title: "Ask record" };
export const dynamic = "force-dynamic";

const stamp = (d: Date) => day(d, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const ISSUES = ["The stage looks wrong", "Attendance is wrong", "The mentor or time is wrong", "An outcome is missing", "Something else"];
const said = (v: string | null | undefined) => (!v ? "No reply yet" : v === "HAPPENED" ? "It happened" : v === "PROBLEM" ? "Reported a problem" : v.toLowerCase().replace(/_/g, " "));

/** A31 Ask record: the conversation facts and the full, append-only history. Nothing is edited here; fixes go through the team lead. */
export default async function AskRecordPage({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/asks/${params.id}/record`);
  if ("to" in r) redirect(r.to);
  const a = await askRecord(params.id);
  if (!a) redirect("/admin/asks/all");
  const c = a.connection;
  const cell = (k: string, v: string) => <div><dt className="text-[11.5px] font-extrabold uppercase tracking-[.07em] text-stone">{k}</dt><dd className="mt-0.5 text-[15px] font-bold">{v}</dd></div>;
  return (
    <AdminShell ctx={r.ctx} phone={{ back: "/admin/asks/all", title: "Ask record" }}>
      <AdminHead eyebrow="Asks · All Asks" title={a.answers.q1.split(/[.?!]/)[0]?.trim() || a.topic} sub={`${a.topic} · ${a.participant.first} · ${a.participant.ageLabel}${a.participant.minor ? " · guardian involved" : ""}`} right={<Pill tone="butter">{STATE_LABEL[a.state] ?? a.state}</Pill>} />
      {["IN_TEAM_REVIEW", "SUBMITTED"].includes(a.state) && <Link href={`/admin/asks/${a.id}`} className="dc-btn dc-btn-forest h-11 self-start">Open in review</Link>}
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Conversation</h2>
        {c ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {cell("Mentor", a.mentor?.name ?? "")}{cell("Status", c.status.toLowerCase().replace(/_/g, " "))}{cell("Scheduled", c.scheduledAt ? stamp(c.scheduledAt) : "Not yet")}
              {cell("Length", `${c.durationMinutes} min`)}{cell("Attendance", c.attendance === "UNKNOWN" ? "Not recorded" : c.attendance.toLowerCase().replace(/_/g, " "))}{cell("Guardian attends", c.guardianAttends ? "Yes" : "No")}
              {cell("Rescheduled", `${c.rescheduleCount} time${c.rescheduleCount === 1 ? "" : "s"}`)}{c.pausedByConcern ? cell("Paused", "By a concern") : null}
            </dl>
            <div className="mt-4 grid gap-2 border-t border-line pt-4 text-[14.5px] lg:grid-cols-3">
              <p><span className="text-bark">Participant said: </span><b>{said(c.participantOutcome)}</b></p>
              <p><span className="text-bark">Mentor said: </span><b>{said(c.mentorOutcome)}</b></p>
              {a.participant.minor && <p><span className="text-bark">Guardian said: </span><b>{said(c.guardianOutcome)}</b></p>}
            </div>
          </>
        ) : <p className="mt-2 text-[14.5px] text-bark">No conversation yet. {a.shortlisted ? `${a.shortlisted} mentors shortlisted.` : ""}</p>}
      </Panel>
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">History</h2>
        <ol className="mt-3 flex flex-col">
          {[...a.history].reverse().map((h, i, arr) => (
            <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < arr.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 bg-line" aria-hidden="true" />}
              <span className={`relative z-[1] mt-1.5 size-4 shrink-0 rounded-full ${i === 0 ? "bg-clay" : "bg-forest"}`} aria-hidden="true" />
              <span className="min-w-0"><b className="text-[15px]">{STATE_LABEL[h.to] ?? h.to}</b>{h.from && <span className="text-[14px] text-bark"> from {STATE_LABEL[h.from] ?? h.from}</span>}{h.reason && <Pill tone="outline" className="ml-2">{REASON_LABEL[h.reason] ?? h.reason}</Pill>}
                <span className="block text-[13px] text-stone">{stamp(h.at)} · {h.actor}</span>{h.note && <span className="block text-[14px] text-bark">{h.note}</span>}</span>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">Something wrong with this record?</h2>
        <ActionForm action={recordIssueAction} className="mt-2" ok="Sent to the team lead." hideOnOk>
          <input type="hidden" name="askId" value={a.id} />
          <div><p className="dc-label">What looks wrong?</p><Select name="what" placeholder="Pick one" options={ISSUES.map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", show: "always" }} /></div>
          <Submit variant="soft" className="self-start">Send to the team lead</Submit>
        </ActionForm>
      </Panel>
      <Note tone="sand" icon="lock">Records cannot be edited here. Fixes go through the team lead so the history stays honest.</Note>
    </AdminShell>
  );
}
