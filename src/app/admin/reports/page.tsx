import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, PanelHead, Pill, StatTile } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { COHORTS, RANGES, buildReport, hoursLabel } from "@/lib/admin-reports";
import { cn } from "@/lib/cn";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const NOTE_TONE = { "Short of mentors": "blush", Balanced: "mint", "Plenty of hours": "butter" } as const;

/** A4 Reports: demand and impact. Counts only, never a ranking of people. Export is limited to the roles that may take data out. */
export default async function Reports({ searchParams }: { searchParams: { range?: string; cohort?: string } }) {
  const r = await adminPage("/admin/reports");
  if ("to" in r) redirect(r.to);
  const rep = await buildReport(Number(searchParams.range) || 90, searchParams.cohort ?? "");
  const canExport = r.ctx.perms.includes("reports.export");
  const qs = (o: Record<string, string>) => new URLSearchParams({ ...(rep.range !== 90 ? { range: String(rep.range) } : {}), ...(rep.cohort ? { cohort: rep.cohort } : {}), ...o }).toString();
  const short = rep.areas.filter((a) => a.note === "Short of mentors").map((a) => a.name);
  const plenty = rep.areas.filter((a) => a.note === "Plenty of hours").map((a) => a.name);
  const stateMax = Math.max(1, ...rep.byState.map((s) => s.n));
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Reports" }}>
      <AdminHead eyebrow="Reports" title="Demand and impact" sub="Where the village is asked most, and where mentors are scarce." right={canExport ? <a href={`/admin/reports/export?${qs({})}`} className="dc-btn dc-btn-primary h-12"><Icon name="download" size={18} />Export CSV</a> : undefined} />
      <div className="flex flex-wrap gap-2">
        {RANGES.map(([d, l]) => <Link key={d} href={`/admin/reports?${new URLSearchParams({ ...(d !== 90 ? { range: String(d) } : {}), ...(rep.cohort ? { cohort: rep.cohort } : {}) })}`} aria-current={rep.range === d ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-[14px] font-bold", rep.range === d ? "bg-forest text-forest-ink" : "bg-sand")}>{l}</Link>)}
        <span className="mx-1 w-px bg-line" aria-hidden="true" />
        {COHORTS.map(([c, l]) => <Link key={c} href={`/admin/reports?${new URLSearchParams({ ...(rep.range !== 90 ? { range: String(rep.range) } : {}), ...(c ? { cohort: c } : {}) })}`} aria-current={rep.cohort === c ? "page" : undefined} className={cn("rounded-full px-3.5 py-2 text-[14px] font-bold", rep.cohort === c ? "bg-forest text-forest-ink" : "bg-sand")}>{l}</Link>)}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile tone="butter" n={rep.submitted} label="Asks submitted" />
        <StatTile tone="mint" n={rep.matchedPct == null ? "None" : `${rep.matchedPct}%`} label="Matched to a mentor" />
        <StatTile tone="blush" n={rep.hoursHeld} label="Hours of conversation" sub={`across ${rep.conversations} calls`} />
        <StatTile tone="butter" n={rep.thanksShared} label="Thanks shared publicly" sub="all read by the team first" />
        <StatTile tone="mint" n={rep.conversations} label="Conversations held" />
        <StatTile tone="blush" n={hoursLabel(rep.medianFirstResponseH)} label="Median first response" sub="mentors, from release" />
        <StatTile tone="butter" n={rep.mentorHoursGiven} label="Mentor hours given this month" />
      </div>
      <Panel>
        <PanelHead title="Demand and supply by area of expertise" />
        <div className="flex gap-4 text-[12.5px] font-semibold"><span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-clay" />Demand (Asks)</span><span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded bg-forest" />Supply (mentor hours a month)</span></div>
        {rep.areas.length ? (
          <ul className="mt-2 divide-y divide-line">
            {rep.areas.map((a) => (
              <li key={a.code} className="py-3">
                <div className="flex items-center justify-between gap-2"><b className="text-[15px]">{a.name}</b><Pill tone={NOTE_TONE[a.note as keyof typeof NOTE_TONE] ?? "sand"}>{a.note}</Pill></div>
                <div className="mt-2 flex flex-col gap-1.5" aria-hidden="true">
                  <div className="flex items-center gap-2"><span className="h-2.5 rounded-r-[4px] bg-clay" style={{ width: `${Math.max(2, a.demandBar * 0.85)}%` }} /><span className="text-[12px] font-bold">{a.demand}</span></div>
                  <div className="flex items-center gap-2"><span className="h-2.5 rounded-r-[4px] bg-forest" style={{ width: `${Math.max(2, a.supplyBar * 0.85)}%` }} /><span className="text-[12px] font-bold">{a.supply}</span></div>
                </div>
                <span className="sr-only">{a.demand} Asks, {a.supply} mentor hours a month.</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[14.5px] text-bark">No Asks in this period yet.</p>}
      </Panel>
      {(short.length > 0 || plenty.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {short.length > 0 && <Note tone="blush" icon="trend"><b>Short of mentors:</b> {short.join(", ")} {short.length === 1 ? "has" : "have"} more Asks than mentor hours. Invite mentors in these areas first.</Note>}
          {plenty.length > 0 && <Note tone="butter" icon="users"><b>Plenty of hours:</b> {plenty.join(", ")} {plenty.length === 1 ? "has" : "have"} spare mentor hours.</Note>}
        </div>
      )}
      <Panel>
        <PanelHead title="Asks by state" />
        <ul className="flex flex-col gap-2.5">{rep.byState.map((s) => <li key={s.state} className="grid grid-cols-[160px_1fr_36px] items-center gap-3 text-[14.5px]"><span>{s.label}</span><span className="h-3 overflow-hidden rounded-full bg-sand"><span className="block h-full rounded-full bg-forest" style={{ width: `${(s.n / stateMax) * 100}%` }} /></span><b className="text-right">{s.n}</b></li>)}</ul>
      </Panel>
    </AdminShell>
  );
}
