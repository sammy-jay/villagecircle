import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, Note, Panel, PanelHead, Person, Pill, Ring, Table, Td } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { queueHealth } from "@/lib/admin-ops";
import { cn } from "@/lib/cn";

export const metadata = { title: "Queue health" };
export const dynamic = "force-dynamic";

const TONE = { ON_TRACK: ["mint", "#2F6B4F"], AT_RISK: ["butter", "#8A6A12"], OVERDUE: ["blush", "#A8472B"] } as const;

/** A20 Queue health: every queue against its service window, what breaches in the next 4 hours, and who is carrying the load. */
export default async function QueueHealth() {
  const r = await adminPage("/admin/queue-health");
  if ("to" in r) redirect(r.to);
  const q = await queueHealth();
  const maxLoad = Math.max(1, ...q.reviewers.map((x) => x.n));
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Queue health" }}>
      <AdminHead eyebrow="Asks" title="Queue health" sub="Every queue has a service window. Overdue items rise to the top on their own." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {q.cards.map((c) => { const [tone, color] = TONE[c.status as keyof typeof TONE] ?? TONE.ON_TRACK; return (
          <li key={c.key} className="flex items-center gap-4 rounded-card border border-line bg-card p-4">
            <Ring pct={c.pct} size={64} color={color}>{c.count}</Ring>
            <div className="min-w-0 flex-1"><b className="block text-[15.5px]">{c.label}</b><span className="block text-[12.5px] text-stone">waiting · oldest {c.oldest} · window {c.windowLabel}</span><Pill tone={tone} className="mt-1.5">{c.statusLabel}</Pill></div>
          </li>
        ); })}
      </ul>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[23px] font-extrabold">Will breach in the next 4 hours</h2><Pill tone={q.soon.length ? "blush" : "mint"}>{q.soon.length} item{q.soon.length === 1 ? "" : "s"}</Pill></div>
        {q.soon.length ? (
          <Table head={["Item", "Queue", "Owner", "Window ends", ""]} minWidth={700} caption="Items close to their window">
            {q.soon.map((x) => (
              <tr key={x.id}><Td className="font-semibold">{x.item}</Td><Td>{x.queue}</Td><Td>{x.assigned ? x.owner : <Pill tone="butter">Unassigned</Pill>}</Td><Td><span className={cn("font-bold", x.overdue ? "text-clay" : "")}>{x.ends}</span></Td><Td><Link href={x.href} className="font-bold text-clay">{x.assigned ? "Open" : "Assign"}</Link></Td></tr>
            ))}
          </Table>
        ) : <Empty title="Nothing close to breaching">Every item is comfortably inside its window.</Empty>}
      </section>
      <Panel>
        <PanelHead title="Reviewer load" right={q.unassigned ? <Link href="/admin/bulk" className="text-[14px] font-bold text-clay">{q.unassigned} unassigned ›</Link> : undefined} />
        {q.reviewers.length ? <ul className="flex flex-col gap-3">{q.reviewers.map((x) => <li key={x.id} className="grid grid-cols-[170px_1fr_30px] items-center gap-3"><Person name={x.name} size={32} /><span className="h-3 overflow-hidden rounded-full bg-sand"><span className="block h-full rounded-full bg-forest" style={{ width: `${(x.n / maxLoad) * 100}%` }} /></span><b className="text-right text-[14px]">{x.n}</b></li>)}</ul> : <p className="text-[14.5px] text-bark">Nobody has open review items.</p>}
        <p className="mt-3 text-[13px] text-stone">Open items per person.</p>
      </Panel>
      <Note tone="butter" icon="bell">Admins get an email and a console badge 4 hours before any window expires. Overdue items rise to the top automatically.</Note>
    </AdminShell>
  );
}
