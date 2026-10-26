import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { KV, Note, Panel, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { getReviewDetail } from "@/lib/review";
import { askHistory, mentorOptions } from "@/lib/admin-asks-view";
import { handMatchAction } from "../../../asks-actions";

export const metadata = { title: "Hand-match" };
export const dynamic = "force-dynamic";

const WAIT = ["New mentors joining soon", "Nobody in this field yet", "Everyone in this field is at their hours", "Waiting on the participant's times"];
const ageText = (b: string) => (b === "15" ? "15" : b === "16-17" ? "16 to 17" : "18 and over");

/** A26 Hand-match: when nobody stepped forward. Widen, ask one mentor personally, suggest a resource, or log it for the demand report. */
export default async function HandMatch({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/asks/${params.id}/hand-match`, "asks.triage");
  if ("to" in r) redirect(r.to);
  const id = params.id;
  const d = await getReviewDetail(id);
  if (!d) redirect("/admin/asks");
  const release = r.ctx.perms.includes("asks.release");
  const [opts, hist] = await Promise.all([release ? mentorOptions(d.participant.minor) : Promise.resolve([]), askHistory(id)]);
  const open = d.ask.state === "IN_TEAM_REVIEW";
  const aside = (
    <>
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">Demand report</h2>
        <p className="mt-1.5 text-[14px] leading-normal text-bark">If you log and wait, this Ask is added to the demand report as <b>unmet: {d.ask.topic}, {ageText(d.participant.ageBand)}</b>. It helps us recruit the right mentors.</p>
        <div className="mt-2"><KV rows={[["Field", d.ask.topic], ["Age band", ageText(d.participant.ageBand)], ["Released", `${d.shortlist.filter((s) => s.releasedAt).length} mentors`]]} /></div>
      </Panel>
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">History</h2>
        <ol className="mt-2 flex flex-col gap-2 text-[14px]">{hist.map((h) => <li key={h.id} className="flex justify-between gap-3"><span>{h.text}</span><span className="shrink-0 text-stone">{day(h.at)}</span></li>)}</ol>
      </Panel>
    </>
  );
  return (
    <AdminShell ctx={r.ctx} aside={aside} phone={{ back: `/admin/asks/${id}`, title: "Hand-match" }}>
      <AdminHead eyebrow="Asks · Ask review" title="Nobody has stepped forward yet" sub={d.review?.summary?.question ?? d.answers.q1} />
      {!open && <Note tone="butter" icon="info">This Ask is not in team review right now, so hand-matching is closed.</Note>}
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Options, in order</h2>
        <ol className="mt-3 flex flex-col gap-4">
          <li className="flex flex-col gap-2 border-b border-line pb-4">
            <b className="text-[16px]">1. Widen the shortlist</b><span className="text-[14px] text-bark">Include mentors one expertise step away, and mentors at their hours limit if they opt in.</span>
            {open && <ActionForm action={handMatchAction} ok="Widened. New names are on the shortlist."><input type="hidden" name="askId" value={id} /><input type="hidden" name="action" value="WIDEN" /><Submit variant="forest" className="self-start">Widen the shortlist</Submit></ActionForm>}
          </li>
          {release && (
            <li className="flex flex-col gap-2 border-b border-line pb-4">
              <b className="text-[16px]">2. Ask a mentor personally</b><span className="text-[14px] text-bark">Send one personal request to someone you know fits. Keep it to the summary.</span>
              {open && <ActionForm action={handMatchAction} ok="Added to the top of the shortlist. Release it from the composer."><input type="hidden" name="askId" value={id} /><input type="hidden" name="action" value="ASK_PERSONALLY" /><Select name="mentorId" placeholder="Choose a mentor" options={opts} /><input name="note" className="dc-saymore" placeholder="Why them (kept in the audit log)" aria-label="Why them" /><Submit variant="soft" className="self-start">Ask personally</Submit></ActionForm>}
            </li>
          )}
          {release && (
            <li className="flex flex-col gap-2 border-b border-line pb-4">
              <b className="text-[16px]">3. Suggest an outside resource</b><span className="text-[14px] text-bark">If nobody fits, send a kind note and a referral. The participant reads it.</span>
              {open && <ActionForm action={handMatchAction} ok="Sent. The Ask is closed as redirected." confirm={{ title: "Close this Ask with a referral?", body: "The participant reads your note.", confirmLabel: "Close with referral" }}><input type="hidden" name="askId" value={id} /><input type="hidden" name="action" value="SUGGEST_RESOURCE" /><textarea name="note" rows={2} className="dc-textarea" placeholder="A kind note and where to go (10 characters or more)" aria-label="Note to the participant" /><Submit variant="soft" className="self-start">Send the referral</Submit></ActionForm>}
            </li>
          )}
          <li className="flex flex-col gap-2">
            <b className="text-[16px]">{release ? "4" : "2"}. Log and wait</b><span className="text-[14px] text-bark">Used for the demand report, so pick the closest reason.</span>
            {open && <ActionForm action={handMatchAction} ok="Logged. It stays in the queue and counts as unmet demand."><input type="hidden" name="askId" value={id} /><input type="hidden" name="action" value="LOG_AND_WAIT" /><Select name="reason" defaultValue={WAIT[0]} options={WAIT.map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", show: "always" }} /><Submit variant="outline" className="self-start">Log and wait</Submit></ActionForm>}
          </li>
        </ol>
      </Panel>
    </AdminShell>
  );
}
