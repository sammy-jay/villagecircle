import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Person, Pill, Table, Td, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { globalSearch } from "@/lib/admin-ops";
import { SCOPE_LABEL, SEARCH_SCOPES, normaliseQuery, queryOk, type SearchScope } from "@/lib/domain/admin-ops";
import { STATE_LABEL } from "@/lib/domain/ask-tracking";
import { revealAction } from "../settings-actions";
import { Reveal } from "./reveal";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

const TONE = { good: "mint", warn: "butter", bad: "blush", neutral: "sand" } as const;

/** A21 Search: people, Asks, mentors, guardians and incidents in one place. Every search is logged; contact details take an extra, logged click. */
export default async function Search({ searchParams }: { searchParams: { q?: string; scope?: string } }) {
  const r = await adminPage("/admin/search");
  if ("to" in r) redirect(r.to);
  const q = normaliseQuery(searchParams.q);
  const scope = (SEARCH_SCOPES as readonly string[]).includes(searchParams.scope ?? "") ? (searchParams.scope as SearchScope) : "all";
  const res = queryOk(q) ? await globalSearch({ id: r.ctx.userId, roles: r.ctx.roles }, q, scope) : null;
  const canPeople = r.ctx.perms.includes("accounts.view");
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Search" }}>
      <AdminHead eyebrow="Settings" title="Search" sub="Find a person, an Ask or an incident. Every search is written to the audit log." />
      <form role="search" className="flex h-[52px] max-w-[620px] items-center gap-2.5 rounded-full border border-line bg-card px-5">
        <Icon name="search" size={19} className="text-stone" />{scope !== "all" && <input type="hidden" name="scope" value={scope} />}
        <input name="q" type="search" defaultValue={q} autoFocus aria-label="Search" placeholder="A name, an email or a topic" className="min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-stone focus:outline-none" />
        <button type="submit" className="dc-btn dc-btn-forest h-10 px-5">Search</button>
      </form>
      {res ? (
        <>
          <FilterPills items={SEARCH_SCOPES.map((s) => ({ href: `/admin/search?${new URLSearchParams({ q, ...(s !== "all" ? { scope: s } : {}) })}`, label: SCOPE_LABEL[s], on: scope === s }))} />
          <p className="text-[14px] text-bark">{res.total} result{res.total === 1 ? "" : "s"} for &ldquo;{q}&rdquo;</p>
          {res.people.length > 0 && canPeople && (
            <section><h2 className="mb-2 font-display text-[21px] font-extrabold">People</h2>
              <Table head={["Name", "Role", "Status", "Contact", ""]} minWidth={760} caption="People found">
                {res.people.map((p) => (
                  <tr key={p.id}><Td><Person name={p.name} size={34} tone={p.minor ? "blush" : "butter"} /></Td><Td className="text-[14px]">{p.role}</Td><Td><Pill tone={TONE[p.status.tone]}>{p.status.label}</Pill></Td>
                    <Td>{p.canReveal ? <Reveal userId={p.id} masked={p.masked} action={revealAction} /> : <span className="font-mono text-[13.5px] text-stone">{p.masked}</span>}</Td>
                    <Td><Link href={`/admin/accounts/${p.id}`} className="font-bold text-clay">Open</Link></Td></tr>
                ))}
              </Table>
            </section>
          )}
          {res.asks.length > 0 && (
            <section><h2 className="mb-2 font-display text-[21px] font-extrabold">Asks</h2>
              <Table head={["Ask", "Participant", "State", "Window", ""]} minWidth={700} caption="Asks found">
                {res.asks.map((a) => <tr key={a.id}><Td className="font-semibold">{a.title}</Td><Td>{a.participant}</Td><Td>{STATE_LABEL[a.state] ?? a.state}</Td><Td>{a.window}</Td><Td><Link href={`/admin/asks/${a.id}/record`} className="font-bold text-clay">Open</Link></Td></tr>)}
              </Table>
            </section>
          )}
          {res.incidents.length > 0 && (
            <section><h2 className="mb-2 font-display text-[21px] font-extrabold">Incidents</h2>
              <ul className="flex flex-col gap-2">{res.incidents.map((i) => <li key={i.id}><Link href={`/admin/incidents/${i.id}`} className="flex justify-between rounded-[18px] border border-line bg-card px-4 py-3 text-[14.5px]"><b className="capitalize">{i.title}</b><span className="text-stone">{i.state.toLowerCase()} · {day(i.created)}</span></Link></li>)}</ul>
            </section>
          )}
          {res.hiddenIncidents && <Note tone="sand" icon="lock">Incidents are searched only by the safeguarding lead.</Note>}
          {res.total === 0 && <Empty title="No results">Try part of a name, an email or a topic.</Empty>}
        </>
      ) : <Empty title="Search the console">Type at least two letters.</Empty>}
      <Note tone="butter" icon="eye">Showing full contact details needs an extra click and a reason, and it is logged. A young person&apos;s contact details are for the safeguarding lead only.</Note>
    </AdminShell>
  );
}
