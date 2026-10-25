import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Person } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { accountDetail } from "@/lib/admin-accounts";
import { MENTOR_SUSPEND_BODY, SUSPEND_REASONS, suspensionEffectsFor } from "@/lib/domain/admin-safety-1";
import { suspendAction } from "../../../people-actions";

export const metadata = { title: "Suspend" };
export const dynamic = "force-dynamic";

/** A23 Suspend mentor (and plain account suspension). A record, never a deletion; the four effects are not optional. */
export default async function Suspend({ params, searchParams }: { params: { id: string }; searchParams: { incident?: string } }) {
  const r = await adminPage(`/admin/accounts/${params.id}/suspend`, "accounts.suspend");
  if ("to" in r) redirect(r.to);
  const a = await accountDetail(params.id);
  if (!a) redirect("/admin/accounts");
  if (a.status !== "ACTIVE" && a.status !== "PENDING_GUARDIAN") redirect(`/admin/accounts/${a.id}`);
  return (
    <AdminShell ctx={r.ctx} phone={{ back: `/admin/accounts/${a.id}`, title: a.short }}>
      <AdminHead eyebrow="People · Accounts" title={a.isMentor ? `Suspend ${a.first}'s eligibility` : `Suspend ${a.first}'s account`} sub={a.isMentor ? MENTOR_SUSPEND_BODY : "They cannot sign in until the account is restored. Nothing is deleted."} />
      <Panel className="flex flex-wrap items-center gap-6">
        <Person name={a.short} size={52} tone="mint" sub={a.isMentor ? `Mentor${a.clearedForMinors ? " · cleared for young people" : ""}` : a.roles.join(", ").toLowerCase()} />
        {a.hours && <p className="text-[14px] text-bark"><b className="font-display text-[22px] text-ink">{a.hours.given}</b> hours given this month</p>}
      </Panel>
      <Panel>
        <ActionForm action={suspendAction} ok={{ suspended: "Suspended. The record is kept and the safeguarding lead has been alerted." }} confirm={`Suspend ${a.short}? This takes effect straight away.`}>
          <input type="hidden" name="id" value={a.id} />{searchParams.incident && <input type="hidden" name="incident" value={searchParams.incident} />}
          {a.isMentor && <div><p className="dc-label">Reason</p><Select name="reason" defaultValue={searchParams.incident ? "V-INCIDENT" : undefined} placeholder="Choose a reason" options={SUSPEND_REASONS.map((x) => ({ value: x.code, label: `${x.code} · ${x.label}` }))} sayMore={{ name: "more", show: "always" }} /><span className="dc-hint">Reason codes are used in reports.</span></div>}
          {a.isMentor && (
            <div>
              <p className="dc-label">What happens next</p>
              <ul className="flex flex-col gap-2.5">{suspensionEffectsFor(a.first).map((e) => <li key={e} className="flex items-start gap-3 text-[15px]"><span className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] bg-forest text-forest-ink"><Icon name="check" size={16} strokeWidth={3} /></span>{e}</li>)}</ul>
            </div>
          )}
          <div><label htmlFor="note" className="dc-label">Internal note</label><textarea id="note" name="note" rows={3} className="dc-textarea" placeholder={a.isMentor ? "Optional. Facts only." : "Required. Facts only."} /><span className="dc-hint">Written to the audit log. Never shown to the person.</span></div>
          <div className="flex flex-wrap gap-2.5"><Submit icon="pause">{a.isMentor ? "Suspend eligibility" : "Suspend account"}</Submit><Link href={`/admin/accounts/${a.id}`} className="dc-btn dc-btn-outline h-[50px]">Cancel</Link></div>
        </ActionForm>
      </Panel>
      <Note tone="sand" icon="lock">Suspending is reversible. Restore from the account page; nothing is deleted.</Note>
    </AdminShell>
  );
}
