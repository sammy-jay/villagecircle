import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { KV, Note, Panel, Person, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { getReviewDetail } from "@/lib/review";
import { confirmAction } from "../../../asks-actions";

export const metadata = { title: "Step forward" };
export const dynamic = "force-dynamic";

const WHY = ["Exact profession match", "Has worked with young adults", "Earliest time offered", "Speaks the participant's language", "Something else"];
const when = (d: Date) => day(d, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** A9 Step forward: choose who takes the Ask, thank the others (never declined), then follow guardian approval and scheduling. */
export default async function StepForward({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/asks/${params.id}/step-forward`, "asks.release");
  if ("to" in r) redirect(r.to);
  const id = params.id;
  const d = await getReviewDetail(id);
  if (!d) redirect("/admin/asks");
  const stepped = d.shortlist.filter((s) => s.response === "STEPPED_FORWARD");
  const decided = !!d.connection;
  return (
    <AdminShell ctx={r.ctx} phone={{ back: `/admin/asks/${id}`, title: "Step forward" }}>
      <AdminHead eyebrow="Asks · Ask review" title={decided ? "Mentor confirmed" : `${stepped.length} ${stepped.length === 1 ? "mentor has" : "mentors have"} stepped forward`} sub={`${d.ask.topic} · ${d.participant.minor ? "under 18, guardian approves" : "adult participant"}`} />
      {!decided && (stepped.length ? (
        <ActionForm action={confirmAction} ok="Confirmed. The others are thanked, and the family is told.">
          <input type="hidden" name="askId" value={id} />
          <ul className="flex flex-col gap-2.5">
            {stepped.map((s, i) => (
              <li key={s.id}><label className="flex cursor-pointer flex-wrap items-center gap-4 rounded-card border-2 border-line bg-card p-4 has-[:checked]:border-forest has-[:checked]:bg-mint/30">
                <input type="radio" name="mentorId" value={s.mentorId} defaultChecked={i === 0} className="size-5 accent-[#2F6B4F]" />
                <Person name={s.name} sub={`${s.headline} · ${s.hoursGiven} of ${s.monthlyHours} hours used`} tone={(["mint", "butter", "blush"] as const)[i % 3]} />
                <span className="ml-auto flex flex-wrap gap-1.5">{s.minorsOk && <Pill tone="mint">Cleared for minors</Pill>}<Pill tone="outline">{s.offeredTimes.length} time{s.offeredTimes.length === 1 ? "" : "s"} offered</Pill></span>
              </label></li>
            ))}
          </ul>
          <Panel>
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="dc-label">Why this mentor</p><Select name="why" defaultValue={WHY[0]} options={WHY.map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", show: "always" }} /><span className="dc-hint">Kept in the Ask history. Counted in reports, never shown to mentors.</span></div>
              <div><p className="dc-label">Message to the others</p><p className="rounded-[16px] bg-sand px-4 py-3 text-[14px] leading-normal">&ldquo;Thank you for stepping forward. Another mentor was the closer fit this time. We really appreciate you offering your hour.&rdquo;</p><span className="dc-hint">Their response is not recorded against them.</span></div>
            </div>
          </Panel>
          <Submit icon="check" className="self-start">Confirm and thank the others</Submit>
        </ActionForm>
      ) : <Note tone="sand" icon="users">Nobody has stepped forward yet. Mentors answer from their inbox.</Note>)}
      {decided && d.connection && (
        <>
          <Panel>
            <h2 className="font-display text-[21px] font-extrabold">Facilitate scheduling</h2>
            <p className="mt-1 text-[14px] text-bark">The confirmed mentor offered these times. The family picks one{d.participant.minor ? " and the guardian approves it" : ""}.</p>
            <ul className="mt-3 flex flex-col gap-2">{d.connection.offered.map((t) => <li key={t.toISOString()} className="flex justify-between rounded-[14px] bg-sand px-4 py-2.5 text-[14.5px]"><b>{when(t)} WAT</b>{d.connection?.scheduledAt && +d.connection.scheduledAt === +t && <Pill tone="mint">Chosen</Pill>}</li>)}</ul>
          </Panel>
          <Panel className="py-2 lg:py-2"><KV rows={[
            ["Guardian approval of mentor", d.participant.minor ? (d.connection.mentorApproved ? `Received ${day(d.connection.mentorApproved)}` : "Waiting") : "Not needed"],
            ["Guardian approval of time", d.participant.minor ? (d.connection.timeApproved ? `Received ${day(d.connection.timeApproved)}` : "Waiting") : "Not needed"],
            ["Call link", d.connection.scheduledAt ? `Issued for ${when(d.connection.scheduledAt)}` : "Issued after both"],
          ]} /></Panel>
          <Note tone="mint" icon="shieldCheck">Scheduling stays blocked for a minor until the guardian approves that specific mentor and time. Contact details never pass between parties.</Note>
        </>
      )}
    </AdminShell>
  );
}
