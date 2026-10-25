import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Pill, Ring, Table, Td } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { reviewQueue } from "@/lib/review";
import { REASON_LABEL } from "@/lib/review-labels";
import { overview } from "@/lib/admin-overview";

export const metadata = { title: "Ask review queue" };
export const dynamic = "force-dynamic";

type F = "ALL" | "AT_RISK" | "FLAGGED" | "AWAITING_GUARDIAN" | "TIME_BOUND";
const REASON_HINT: Record<string, string> = { R_NEW: "New Ask", R_THIN: "Returned for detail", R_CONSENT: "Consent", R_FLAG: "Flagged", R_REFER: "Referred", R_NOONE: "No mentor", R_QUIET: "Handed back", R_MANY: "Several stepped forward", R_TIME: "Time-bound", R_AGAIN: "Asked again", R_MISS: "Missed", R_CONCERN: "Concern" };

function left(due: Date | null, now: Date) {
  if (!due) return { text: "On hold", tone: "butter" as const };
  const h = (due.getTime() - now.getTime()) / 3600_000;
  if (h <= 0) return { text: "Overdue", tone: "blush" as const };
  if (h < 24) return { text: `${Math.ceil(h)} h left`, tone: "blush" as const };
  return { text: `${Math.floor(h / 24)} d left`, tone: "sand" as const };
}

/** A7 Ask review queue: oldest first against the service window, with reason code, consent and flags visible without opening the record. */
export default async function AskQueue({ searchParams }: { searchParams: { filter?: string; owner?: string } }) {
  const r = await adminPage("/admin/asks");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const f = (["ALL", "AT_RISK", "FLAGGED", "AWAITING_GUARDIAN", "TIME_BOUND"] as const).find((x) => x === searchParams.filter) ?? "ALL";
  const [q, o] = await Promise.all([reviewQueue(f as F), overview(c.roles)]);
  const rows = searchParams.owner === "me" ? q.rows.filter((x) => x.owner === c.userId) : searchParams.owner === "none" ? q.rows.filter((x) => !x.owner) : q.rows;
  const now = new Date();
  const atRisk = q.rows.filter((x) => x.atRisk && !x.overdue).length;
  const median = o.health.medianReviewDays;
  const href = (k: string) => `/admin/asks?${new URLSearchParams({ ...(k !== "ALL" ? { filter: k } : {}), ...(searchParams.owner ? { owner: searchParams.owner } : {}) })}`;
  const owner = (k: string) => `/admin/asks?${new URLSearchParams({ ...(f !== "ALL" ? { filter: f } : {}), ...(k ? { owner: k } : {}) })}`;
  return (
    <AdminShell ctx={c} phone={{ title: "Ask review" }}>
      <AdminHead eyebrow="Asks" title="Ask review queue" sub="Ordered by age against the service window. Reason code, consent and flagged content are visible without opening the record." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills items={([["ALL", "All", q.counts.all], ["AT_RISK", "At risk", q.counts.atRisk], ["FLAGGED", "Flagged", q.counts.flagged], ["AWAITING_GUARDIAN", "Awaiting guardian", q.counts.awaitingGuardian], ["TIME_BOUND", "Time-bound", q.counts.timeBound]] as const).map(([k, l, n]) => ({ href: href(k), label: l, n, on: f === k }))} />
        <nav aria-label="Owner" className="flex gap-1.5 text-[13.5px] font-bold">{([["", "Owner: anyone"], ["me", "Mine"], ["none", "Unassigned"]] as const).map(([k, l]) => <Link key={k} href={owner(k)} aria-current={(searchParams.owner ?? "") === k ? "page" : undefined} className={(searchParams.owner ?? "") === k ? "rounded-full border-2 border-ink px-3 py-1.5" : "rounded-full border border-line bg-card px-3 py-1.5"}>{l}</Link>)}</nav>
      </div>
      <section className="flex items-center gap-4 rounded-card bg-mint p-5 text-mint-ink">
        <Ring pct={o.health.total ? (o.health.onTime / o.health.total) * 100 : 100} size={66} color="#2F6B4F" track="#fff" />
        <div><p className="font-display text-[24px] font-extrabold">{median == null ? "No reviews yet this month" : `${median.toFixed(1)} business days`}</p><p className="text-[14px]">Median review time this month. The service window is {o.health.reviewDays} business days.</p></div>
      </section>
      {rows.length ? (
        <Table head={["Ask", "Age band", "Service window", "Reason code", "Consent", "Content flag", "Owner"]} minWidth={940} caption="Asks waiting for review">
          {rows.map((x) => { const l = left(x.state === "AWAITING_GUARDIAN" ? null : x.due, now); return (
            <tr key={x.id} className="hover:bg-paper">
              <Td><Link href={`/admin/asks/${x.id}`} className="font-bold hover:underline">{x.title}</Link>{x.returned && <span className="block text-[12px] text-stone">Returned for detail</span>}</Td>
              <Td>{x.ageLabel}</Td>
              <Td><Pill tone={l.tone} icon={l.tone === "sand" ? undefined : "clock"}>{l.text}</Pill></Td>
              <Td>{x.reason ? <><Pill tone="outline">{REASON_LABEL[x.reason] ?? x.reason}</Pill><span className="mt-1 block text-[12px] text-stone">{REASON_HINT[x.reason] ?? ""}</span></> : "None"}</Td>
              <Td><Pill tone={x.consent === "Awaiting guardian" ? "butter" : "mint"}>{x.consent}</Pill></Td>
              <Td>{x.flag === "None" ? <span className="text-bark">None</span> : <Pill tone="blush">{x.flag}</Pill>}</Td>
              <Td>{x.owner ? <span className="font-semibold">{x.ownerName}</span> : x.state === "AWAITING_GUARDIAN" ? "Guardian" : <Pill tone="butter">{x.ownerName}</Pill>}</Td>
            </tr>
          ); })}
        </Table>
      ) : <Empty title="The queue is clear">No Asks match this view. New Asks arrive here oldest first.</Empty>}
      {atRisk > 0 && <Note tone="butter" icon="alert"><b>Service window at risk:</b> {atRisk} Ask{atRisk === 1 ? "" : "s"} will pass {atRisk === 1 ? "its" : "their"} window within 4 hours. Admins are emailed and the console badge turns gold.</Note>}
      <p className="flex items-center gap-3 rounded-card border border-line bg-card px-5 py-4 text-[14px]"><Icon name="refresh" size={18} className="shrink-0" />An Ask with nobody stepping forward after two release windows returns to this queue rather than lapsing silently.</p>
    </AdminShell>
  );
}
