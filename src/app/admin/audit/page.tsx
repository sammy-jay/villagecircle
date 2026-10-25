import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, Note, Person, Table, Td, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { auditPage } from "@/lib/admin-data";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

/** A15 Audit log: append-only. Filter by person, object and dates; exporting is itself recorded. */
export default async function Audit({ searchParams }: { searchParams: { actor?: string; object?: string; from?: string; to?: string; page?: string } }) {
  const r = await adminPage("/admin/audit");
  if ("to" in r) redirect(r.to);
  const f = { actor: searchParams.actor || undefined, object: searchParams.object || undefined, from: searchParams.from || undefined, to: searchParams.to || undefined, page: Number(searchParams.page) || 1 };
  const a = await auditPage(f);
  const qs = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries({ ...searchParams, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Audit log" }}>
      <AdminHead eyebrow="Safety" title="Audit log" sub="Every action in the console, with before and after." />
      <form className="grid gap-3 rounded-card border border-line bg-card p-4 lg:grid-cols-[1fr_1fr_160px_160px_auto] lg:items-end">
        <div><label htmlFor="actor" className="dc-label">Person</label><select id="actor" name="actor" defaultValue={f.actor ?? ""} className="dc-input"><option value="">Anyone</option>{a.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label htmlFor="object" className="dc-label">Ask, mentor, template</label><input id="object" name="object" defaultValue={f.object ?? ""} placeholder="For example Ask, Template" className="dc-input" /></div>
        <div><label htmlFor="from" className="dc-label">From</label><input id="from" name="from" type="date" defaultValue={f.from ?? ""} className="dc-input" /></div>
        <div><label htmlFor="to" className="dc-label">To</label><input id="to" name="to" type="date" defaultValue={f.to ?? ""} className="dc-input" /></div>
        <div className="flex gap-2"><button type="submit" className="dc-btn dc-btn-forest h-[58px]"><Icon name="search" size={18} />Search</button><a href={`/admin/audit/export?${qs({ page: undefined })}`} className="dc-btn dc-btn-soft h-[58px]"><Icon name="download" size={18} />Export CSV</a></div>
      </form>
      {a.rows.length ? (
        <Table head={["Actor", "Action", "Object", "Before and after", "When"]} minWidth={900} caption="Audit entries">
          {a.rows.map((x) => (
            <tr key={x.id}>
              <Td><Person name={x.actor} size={32} /></Td><Td className="font-semibold">{x.action}</Td><Td>{x.object}</Td>
              <Td className="max-w-[300px] text-[13.5px] text-bark">{x.change || "None"}</Td><Td className="whitespace-nowrap">{day(x.when, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Td>
            </tr>
          ))}
        </Table>
      ) : <Empty title="No entries">Nothing matches these filters.</Empty>}
      <nav aria-label="Pages" className="flex justify-between text-[14px]"><span className="text-bark">Page {a.page}</span><span className="flex gap-2">{a.page > 1 && <Link href={`/admin/audit?${qs({ page: String(a.page - 1) })}`} className="dc-btn dc-btn-soft h-10">Previous</Link>}{a.more && <Link href={`/admin/audit?${qs({ page: String(a.page + 1) })}`} className="dc-btn dc-btn-forest h-10">Next page</Link>}</span></nav>
      <Note tone="sand" icon="lock">Entries cannot be edited or deleted by anyone, including administrators.</Note>
    </AdminShell>
  );
}
