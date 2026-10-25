import Link from "next/link";
import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, Note, Panel, Pill, Table, Td } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { reviewCycleRows } from "@/lib/admin-village";
import { resourceReviewFormAction } from "../../content-actions";

export const metadata = { title: "Review cycle" };
export const dynamic = "force-dynamic";

const ago = (iso: string | null) => { if (!iso) return "Never"; const m = Math.round((Date.now() - +new Date(iso)) / (30 * 86400_000)); return m < 1 ? "This month" : `${m} month${m === 1 ? "" : "s"} ago`; };
const status = (days: number) => (days < 0 ? { l: "Expired", t: "blush" as const } : days <= 60 ? { l: `Due in ${days} days`, t: "butter" as const } : { l: "Current", t: "mint" as const });

/** A27 Library review cycle: oldest first. Still correct resets the clock; Update sends it back to be edited; Retire hides it and keeps the record. */
export default async function ReviewCycle({ searchParams }: { searchParams: { id?: string } }) {
  const r = await adminPage("/admin/library/review");
  if ("to" in r) redirect(r.to);
  const rows = await reviewCycleRows();
  const sel = rows.find((x) => x.id === searchParams.id) ?? rows.find((x) => x.dueInDays <= 60);
  return (
    <AdminShell ctx={r.ctx} phone={{ back: "/admin/library", title: "Review cycle" }}>
      <AdminHead eyebrow="Content · Library" title="Review cycle" sub="Every live resource is re-checked on a schedule. Oldest first." />
      {rows.length ? (
        <Table head={["Resource", "Topic", "Contributor", "Last reviewed", "Status", ""]} minWidth={760} caption="Resources by review date">
          {rows.map((x) => { const s = status(x.dueInDays); return (
            <tr key={x.id} className={x.id === sel?.id ? "bg-butter/40" : "hover:bg-paper"}>
              <Td className="font-semibold">{x.title}</Td><Td>{x.topics[0] ?? ""}</Td><Td>{x.contributor}</Td><Td>{ago(x.lastReviewedISO)}</Td><Td><Pill tone={s.t}>{s.l}</Pill></Td>
              <Td><Link href={`/admin/library/review?id=${x.id}`} className="font-bold text-clay">{x.dueInDays <= 60 ? "Review" : "View"}</Link></Td>
            </tr>
          ); })}
        </Table>
      ) : <Empty title="Nothing to review">Live resources appear here with their next review date.</Empty>}
      {sel && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[21px] font-extrabold">Review: {sel.title}</h2><Pill tone={status(sel.dueInDays).t}>{status(sel.dueInDays).l}</Pill></div>
          <ActionForm action={resourceReviewFormAction} className="mt-3" ok={{ reviewed: "Reviewed. The clock resets to today.", archived: "Retired. Hidden from the library; the record is kept." }}>
            <input type="hidden" name="id" value={sel.id} />
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="dc-label">Outcome</p><Select name="outcome" defaultValue="REVIEWED" options={[{ value: "REVIEWED", label: "Still correct" }, { value: "UPDATE", label: "Update (edit, then review again)" }, { value: "ARCHIVE", label: "Retire" }]} /></div>
              <div><label htmlFor="reviewer" className="dc-label">Reviewer</label><input id="reviewer" name="reviewer" defaultValue={r.ctx.name} className="dc-input" /></div>
            </div>
            <div><label htmlFor="note" className="dc-label">Note</label><textarea id="note" name="note" rows={2} className="dc-textarea" placeholder="Optional for Still correct. Required to retire." /></div>
            <Submit variant="forest" className="self-start">Save review</Submit>
          </ActionForm>
        </Panel>
      )}
      <Note tone="butter" icon="clock"><b>Admissions, legal and immigration advice</b> expires after six months by default. Other topics are checked every twelve months.</Note>
    </AdminShell>
  );
}
