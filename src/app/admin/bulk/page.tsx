import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, Note, Panel, Pill } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { bulkQueue } from "@/lib/admin-ops";
import { EXPERTISE } from "@/lib/domain/expertise";
import { BULK_MAX } from "@/lib/domain/admin-ops";
import { cn } from "@/lib/cn";
import { bulkAction } from "../settings-actions";

export const metadata = { title: "Bulk actions" };
export const dynamic = "force-dynamic";

const TONE = { warn: "butter", bad: "blush", neutral: "outline" } as const;

/** A22 Bulk actions: organise work only (assign, tag, remind). Release is always one Ask at a time; safeguarding items are never bulk-handled. */
export default async function Bulk({ searchParams }: { searchParams: { reason?: string; unassigned?: string } }) {
  const r = await adminPage("/admin/bulk");
  if ("to" in r) redirect(r.to);
  const q = await bulkQueue();
  const reasons = [...new Set(q.rows.map((x) => x.reason))];
  const rows = q.rows.filter((x) => (!searchParams.reason || x.reason === searchParams.reason) && (searchParams.unassigned !== "1" || x.reviewer === "Unassigned"));
  const load = (name: string) => q.rows.filter((x) => x.reviewer === name).length;
  const href = (o: Record<string, string | undefined>) => `/admin/bulk?${new URLSearchParams(Object.entries({ reason: searchParams.reason, unassigned: searchParams.unassigned, ...o }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Bulk actions" }}>
      <AdminHead eyebrow="Asks" title="Bulk actions" sub={`Organise up to ${BULK_MAX} Asks at once: assign a reviewer, set expertise, or send a gentle reminder.`} />
      <nav aria-label="Filter" className="flex flex-wrap gap-2 text-[14px] font-bold">
        <Link href={href({ reason: undefined })} aria-current={!searchParams.reason ? "page" : undefined} className={cn("rounded-full px-3.5 py-2", !searchParams.reason ? "bg-forest text-forest-ink" : "bg-sand")}>All reasons</Link>
        {reasons.map((x) => <Link key={x} href={href({ reason: x })} aria-current={searchParams.reason === x ? "page" : undefined} className={cn("rounded-full px-3.5 py-2", searchParams.reason === x ? "bg-forest text-forest-ink" : "bg-sand")}>{x}</Link>)}
        <Link href={href({ unassigned: searchParams.unassigned === "1" ? undefined : "1" })} aria-current={searchParams.unassigned === "1" ? "page" : undefined} className={cn("rounded-full px-3.5 py-2", searchParams.unassigned === "1" ? "bg-forest text-forest-ink" : "bg-sand")}>Unassigned only</Link>
      </nav>
      {rows.length ? (
        <ActionForm action={bulkAction} ok={{ ASSIGN: "Assigned.", SET_EXPERTISE: "Expertise set.", REMIND: "Reminders sent." }}>
          <div className="overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full min-w-[720px] text-left text-[14.5px]">
              <caption className="sr-only">Asks you can organise</caption>
              <thead className="bg-sand"><tr>{["", "Ask", "Reason", "Waiting", "Reviewer"].map((h) => <th key={h} scope="col" className="px-5 py-3.5 text-[12px] font-extrabold uppercase tracking-[.06em] text-bark">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((x) => (
                  <tr key={x.id} className={x.locked ? "bg-paper text-stone" : ""}>
                    <td className="px-5 py-3"><input type="checkbox" name="ask" value={x.id} disabled={x.locked} aria-label={`Select ${x.title}`} className="size-5 accent-[#2F6B4F]" /></td>
                    <td className="px-5 py-3"><Link href={`/admin/asks/${x.id}`} className="font-semibold hover:underline">{x.title}</Link><span className="block text-[12.5px] text-stone">{x.sub}</span>{x.locked && <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-clay"><Icon name="lock" size={13} />Safeguarding: handle on its own</span>}</td>
                    <td className="px-5 py-3"><Pill tone={TONE[x.tone]}>{x.reason}</Pill></td>
                    <td className="px-5 py-3">{x.waiting}</td>
                    <td className="px-5 py-3">{x.reviewer === "Unassigned" ? <Pill tone="butter">Unassigned</Pill> : x.reviewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="flex flex-col gap-2.5"><h2 className="font-display text-[18px] font-extrabold">Assign reviewer</h2><Select name="reviewerId" placeholder="Choose a reviewer" options={q.reviewers.map((v) => ({ value: v.id, label: `${v.name} (${load(v.name)} open)` }))} /><Submit name="action" value="ASSIGN" variant="forest">Assign to selected</Submit></Panel>
            <Panel className="flex flex-col gap-2.5"><h2 className="font-display text-[18px] font-extrabold">Set expertise needed</h2><Select name="expertise" placeholder="Choose a field" options={EXPERTISE.map(([value, label]) => ({ value, label }))} /><span className="text-[12.5px] text-stone">Same list as the Taxonomy page.</span><Submit name="action" value="SET_EXPERTISE" variant="soft">Set expertise</Submit></Panel>
            <Panel className="flex flex-col gap-2.5"><h2 className="font-display text-[18px] font-extrabold">Reminder to participants</h2><p className="text-[13.5px] text-bark">&ldquo;The team is still working on your Ask. There is nothing you need to do.&rdquo;</p><Submit name="action" value="REMIND" variant="soft">Send reminder</Submit></Panel>
          </div>
        </ActionForm>
      ) : <Empty title="Nothing to organise">No Asks match these filters.</Empty>}
      <Note tone="butter" icon="lock">Release is always one Ask at a time. Releasing to mentors needs a person to read and compose the summary, so there is no bulk release or bulk approve. Nothing that reaches a mentor or a minor can be bulk-done.</Note>
    </AdminShell>
  );
}
