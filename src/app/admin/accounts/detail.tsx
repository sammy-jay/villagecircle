import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { KV, Note, Panel, Person, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import type { accountDetail } from "@/lib/admin-accounts";
import { rolesLabel, STATUS_VIEW } from "@/lib/domain/admin-safety-1";
import { deleteAccountAction, restoreAction } from "../people-actions";

type A = NonNullable<Awaited<ReturnType<typeof accountDetail>>>;
const TONE = { good: "mint", warn: "butter", bad: "blush", neutral: "sand" } as const;

/** A16 selected account: who they are, and restore / suspend / delete. Email and phone are never shown here. */
export function AccountDetail({ a, canSuspend, canDelete }: { a: A; canSuspend: boolean; canDelete: boolean }) {
  const st = STATUS_VIEW[a.status];
  const live = a.status === "ACTIVE" || a.status === "PENDING_GUARDIAN";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><Person name={a.short} size={56} tone="mint" sub={`${rolesLabel(a.roles)}${a.age != null ? ` · ${a.age}` : ""}`} /><Pill tone={TONE[st.tone]}>{st.label}</Pill></div>
      <Panel className="py-2 lg:py-2"><KV rows={[
        ["Joined", day(a.joined, { day: "numeric", month: "short", year: "numeric" })],
        ...(a.isMentor ? [["Mentor", `${a.expertise ?? ""}${a.clearedForMinors ? " · cleared for young people" : ""}`] as [string, string], ["Hours this month", `${a.hours?.given ?? 0} of ${a.hours?.monthly ?? 0}`] as [string, string]] : []),
        ["Suspensions on record", String(a.suspensions)],
        ...(a.suspension ? [["Current suspension", `${a.suspension.reason}, since ${day(a.suspension.since)}`] as [string, string]] : []),
      ]} /></Panel>
      {canSuspend && (
        <Panel>
          <div className="flex flex-wrap gap-2.5">
            {live ? <Link href={`/admin/accounts/${a.id}/suspend`} className="dc-btn dc-btn-primary h-[50px]"><Icon name="pause" size={18} />{a.isMentor ? "Suspend eligibility" : "Suspend"}</Link> : (
              <ActionForm action={restoreAction} ok="Restored. Nothing was deleted, so the account is back as it was." confirm={{ title: `Restore ${a.short}?`, body: "Their account comes back as it was. Nothing was deleted.", confirmLabel: "Restore account" }}><input type="hidden" name="id" value={a.id} /><Submit variant="forest" icon="refresh">Restore</Submit></ActionForm>
            )}
          </div>
          <p className="mt-2 text-[13px] text-stone">Every action goes into the audit log. Admin access is granted, never self-assigned.</p>
        </Panel>
      )}
      {canDelete && a.status !== "CLOSED" && (
        <Panel>
          <h3 className="font-display text-[19px] font-extrabold">Delete account and data</h3>
          <p className="mt-1 text-[14px] text-bark">Personal data is removed after a 30-day hold, and consent records are kept for the statutory period.</p>
          <ActionForm action={deleteAccountAction} className="mt-3" ok="Deletion scheduled. The account is suspended now and anonymised after 30 days." confirm={{ title: `Schedule deletion of ${a.name}?`, body: "The account is suspended now and anonymised after 30 days. This cannot be undone after the hold.", confirmLabel: "Schedule deletion", danger: true }}>
            <input type="hidden" name="id" value={a.id} />
            <div><label htmlFor="typed" className="dc-label">Type the name to confirm</label><input id="typed" name="typed" autoComplete="off" placeholder={a.name} className="dc-input" /></div>
            <Submit variant="outline" icon="trash" className="self-start">Delete account and data</Submit>
          </ActionForm>
        </Panel>
      )}
      <Note tone="sand" icon="shieldCheck">Admins sign in with a second factor and sign a confidentiality undertaking. The safeguarding-lead permission is granted separately.</Note>
    </div>
  );
}
