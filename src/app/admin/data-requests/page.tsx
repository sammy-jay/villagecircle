import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, KV, Note, Panel, Person, Pill, Table, Td, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { dataRequestDetail, dataRequests } from "@/lib/admin-data";
import { dataRequestAction } from "../safety-actions";

export const metadata = { title: "Data requests" };
export const dynamic = "force-dynamic";

const TONE = { good: "mint", warn: "butter", bad: "blush", neutral: "sand" } as const;

/** A28 Data requests: exports and deletions within a month. A child cannot delete an account alone; the guardian confirms first. */
export default async function DataRequests({ searchParams }: { searchParams: { key?: string } }) {
  const r = await adminPage("/admin/data-requests");
  if ("to" in r) redirect(r.to);
  const rows = await dataRequests();
  const selKey = searchParams.key ?? rows.find((x) => x.status.needsAction)?.key;
  const d = selKey ? await dataRequestDetail(selKey, r.ctx.roles) : null;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Data requests" }}>
      <AdminHead eyebrow="Safety" title="Data requests" sub="Exports and account deletions. Each is answered within a month." />
      {rows.length ? (
        <Table head={["Person", "Request", "Received", "Due", "Status", ""]} minWidth={760} caption="Data requests">
          {rows.map((x) => (
            <tr key={x.key} className={x.key === selKey ? "bg-butter/40" : "hover:bg-paper"}>
              <Td><Person name={x.person} size={36} tone={x.minor ? "blush" : "mint"} /></Td><Td>{x.request}</Td><Td>{day(x.received)}</Td><Td>{day(x.due)}</Td>
              <Td><Pill tone={TONE[x.status.tone]}>{x.status.label}</Pill></Td>
              <Td><Link href={`/admin/data-requests?key=${x.key}`} className="font-bold text-clay">{x.status.needsAction ? "Open" : "View"}</Link></Td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="No data requests">Exports and deletion requests appear here with their due date.</Empty>}
      {d && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[21px] font-extrabold">Open: {d.person} · {d.request}</h2><Pill tone={TONE[d.status.tone]}>{d.status.label}</Pill></div>
          {d.minor && d.request === "Delete account" && <p className="mt-2 text-[14.5px] text-bark">A child cannot delete an account alone. We wait for the guardian to confirm before anything is removed. Due {day(d.due)}.</p>}
          <div className="mt-2"><KV rows={[["Open incidents involving them", String(d.openIncidents)], ["Team state", d.teamState ? d.teamState.toLowerCase() : "Not started"], ["Delete now", d.canDeleteNow ? "Allowed" : d.deleteBlocked ?? "Not allowed"]]} /></div>
          {!d.status.done && (
            <ActionForm action={dataRequestAction} className="mt-3" ok={{ CONFIRM: "Confirmed.", HOLD: "Legal hold placed.", RELEASE: "Hold lifted.", DONE: "Marked complete.", DELETE_NOW: "Deleted. The account is anonymised." }}>
              <input type="hidden" name="key" value={d.key} />
              <input name="note" className="dc-saymore" placeholder="Add a note for the audit log (optional)" aria-label="Note for the audit log" />
              <div className="flex flex-wrap gap-2.5">
                <Submit name="action" value="CONFIRM" variant="forest">{d.minor ? "Guardian confirmed" : "Identity confirmed"}</Submit>
                <Submit name="action" value="DONE" variant="soft">Mark complete</Submit>
                {d.isSg && <Submit name="action" value={d.teamState === "HELD" ? "RELEASE" : "HOLD"} variant="outline">{d.teamState === "HELD" ? "Lift legal hold" : "Place legal hold"}</Submit>}
                {d.isSg && d.request === "Delete account" && <Submit name="action" value="DELETE_NOW" variant="ghost" disabled={!d.canDeleteNow}>Delete now</Submit>}
              </div>
            </ActionForm>
          )}
        </Panel>
      )}
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">What is kept after deletion</h2>
        <div className="mt-2"><KV rows={[["Consent and attestation records", "Statutory period (to be confirmed with counsel)"], ["Closed Asks", "Deleted after 24 months"], ["Incident records", "Kept, restricted access"], ["Thanks", "Anonymised"]]} /></div>
      </Panel>
      <Note tone="butter" icon="info">Retention periods here are placeholders until counsel confirms them.</Note>
    </AdminShell>
  );
}
