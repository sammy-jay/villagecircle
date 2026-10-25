import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Pill, Table, Td, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { allAsks } from "@/lib/admin-all-asks";
import { STATE_LABEL, type TrackFilter } from "@/lib/domain/ask-tracking";

export const metadata = { title: "All Asks" };
export const dynamic = "force-dynamic";

const PER = 20;
const FILTERS: [TrackFilter, string, keyof Awaited<ReturnType<typeof allAsks>>["counts"]][] = [["ALL", "All", "all"], ["ATTENTION", "Needs attention", "attention"], ["UPCOMING", "Next 72 hours", "upcoming"], ["UNDER18", "Under 18", "under18"], ["REVIEW", "In review", "review"], ["MATCHING", "Finding a mentor", "matching"], ["SCHEDULED", "Scheduled", "scheduled"], ["DONE", "Held and after", "done"], ["CLOSED", "Closed", "closed"]];
const when = (d: Date) => day(d, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** A30 All Asks: every Ask from submission to close, read-only, newest change first, with what needs attention. */
export default async function AllAsks({ searchParams }: { searchParams: { f?: string; q?: string; page?: string } }) {
  const r = await adminPage("/admin/asks/all");
  if ("to" in r) redirect(r.to);
  const f = (FILTERS.find(([k]) => k === searchParams.f)?.[0] ?? "ALL") as TrackFilter;
  const q = searchParams.q ?? "";
  const data = await allAsks(f, q);
  const pages = Math.max(1, Math.ceil(data.rows.length / PER)); const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1));
  const rows = data.rows.slice((page - 1) * PER, page * PER);
  const href = (o: { f?: string; page?: number }) => `/admin/asks/all?${new URLSearchParams({ ...((o.f ?? f) !== "ALL" ? { f: o.f ?? f } : {}), ...(q ? { q } : {}), ...(o.page && o.page > 1 ? { page: String(o.page) } : {}) })}`;
  const now = Date.now();
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "All Asks" }}>
      <AdminHead eyebrow="Asks" title="All Asks" sub="Every Ask from submission to close. Read-only: changes happen in review, or through the team lead." />
      <form className="flex h-12 max-w-[460px] items-center gap-2.5 rounded-full border border-line bg-card px-4" role="search">
        <Icon name="search" size={18} className="text-stone" />{f !== "ALL" && <input type="hidden" name="f" value={f} />}
        <input name="q" defaultValue={q} type="search" aria-label="Search Asks by topic, first name or mentor" placeholder="Search by topic, first name or mentor" className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-stone focus:outline-none" />
      </form>
      <FilterPills items={FILTERS.map(([k, l, c]) => ({ href: href({ f: k }), label: l, n: data.counts[c], on: f === k }))} />
      {rows.length ? (
        <>
          <p className="text-[13px] text-stone">Showing {rows.length} of {data.rows.length} · newest change first</p>
          <Table head={["Ask", "Participant", "Stage", "Mentor", "Conversation", "Last change", "Attention"]} minWidth={1000} caption="All Asks">
            {rows.map((x) => (
              <tr key={x.id} className="hover:bg-paper">
                <Td><Link href={`/admin/asks/${x.id}/record`} className="font-bold hover:underline">{x.title}</Link><span className="block text-[12.5px] text-stone">{x.topic}</span></Td>
                <Td><b className="font-semibold">{x.participant}</b><span className="block text-[12.5px] text-stone">{x.ageLabel}{x.minor ? " · guardian involved" : ""}</span></Td>
                <Td>{STATE_LABEL[x.state] ?? x.state}</Td>
                <Td>{x.mentor ?? <span className="text-stone">None yet</span>}</Td>
                <Td>{x.scheduledAt ? <>{when(x.scheduledAt)}{+x.scheduledAt > now && x.upcoming && <Pill tone="mint" className="ml-1.5">Coming up</Pill>}</> : <span className="text-stone">Not scheduled</span>}</Td>
                <Td>{day(x.updatedAt)}</Td>
                <Td>{x.attention.length ? <Pill tone="blush">{x.attention[0]}</Pill> : <span className="text-stone">None</span>}</Td>
              </tr>
            ))}
          </Table>
          {pages > 1 && <nav aria-label="Pages" className="flex items-center justify-between text-[14px]"><span className="text-bark">Page {page} of {pages}</span><span className="flex gap-2">{page > 1 && <Link href={href({ page: page - 1 })} className="dc-btn dc-btn-soft h-10">Previous</Link>}{page < pages && <Link href={href({ page: page + 1 })} className="dc-btn dc-btn-forest h-10">Next page</Link>}</span></nav>}
        </>
      ) : <Empty title="No Asks here">{q ? "Nothing matches that search." : "No Asks in this view yet."}</Empty>}
    </AdminShell>
  );
}
