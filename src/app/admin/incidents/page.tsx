import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Pill, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { incidentDetail, incidentList } from "@/lib/admin-incidents";
import { canActOnIncident } from "@/lib/domain/admin-safety-1";
import { cn } from "@/lib/cn";
import { IncidentDetail } from "./detail";

export const metadata = { title: "Incidents" };
export const dynamic = "force-dynamic";

/** A11 Incidents: open first by deadline. Reports pause the connection first and ask questions second. */
export default async function Incidents({ searchParams }: { searchParams: { show?: string; id?: string } }) {
  const r = await adminPage("/admin/incidents");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const all = await incidentList(c.roles);
  const closed = searchParams.show === "closed";
  const rows = all.filter((i) => (closed ? i.state === "CLOSED" : i.state !== "CLOSED"));
  const selId = searchParams.id ?? rows[0]?.id;
  const sel = selId ? await incidentDetail(selId, c.roles) : null;
  const canAct = canActOnIncident(c.roles) && c.perms.includes("safety.act");
  const href = (o: { show?: string; id?: string }) => `/admin/incidents?${new URLSearchParams({ ...((o.show ?? (closed ? "closed" : "")) ? { show: o.show ?? "closed" } : {}), ...(o.id ? { id: o.id } : {}) })}`;
  return (
    <AdminShell ctx={c} phone={{ title: "Incidents" }}>
      <AdminHead eyebrow="Safety" title="Incidents" sub="Reports pause the connection first and ask questions second. Every step is recorded." />
      <FilterPills items={[{ href: "/admin/incidents", label: "Open", n: all.filter((i) => i.state !== "CLOSED").length, on: !closed }, { href: "/admin/incidents?show=closed", label: "Closed", n: all.filter((i) => i.state === "CLOSED").length, on: closed }]} />
      {rows.length ? (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <ul className="flex flex-col gap-2 self-start">
            {rows.map((i) => (
              <li key={i.id}>
                <Link href={href({ id: i.id })} aria-current={i.id === selId ? "true" : undefined} className={cn("block rounded-[20px] px-4 py-3 max-lg:hidden", i.countdown?.overdue ? "bg-blush text-blush-ink" : i.state === "CLOSED" ? "border border-line bg-card" : "bg-butter text-butter-ink", i.id === selId && "ring-2 ring-ink")}>
                  <span className="flex items-center justify-between gap-2"><b className="text-[15px] capitalize">#{i.ref} · {i.category}</b><Pill tone="outline">{i.stateLabel}</Pill></span>
                  <span className="mt-1 block text-[13px] font-semibold">{i.countdown?.label ?? `Opened ${day(i.created)}`}</span>
                </Link>
                <Link href={`/admin/incidents/${i.id}`} className={cn("block rounded-[20px] px-4 py-3 lg:hidden", i.countdown?.overdue ? "bg-blush text-blush-ink" : "bg-butter text-butter-ink")}><b className="text-[15px] capitalize">#{i.ref} · {i.category}</b><span className="block text-[13px]">{i.stateLabel} · {i.countdown?.label ?? day(i.created)}</span></Link>
              </li>
            ))}
          </ul>
          <div className="max-lg:hidden">{sel && <IncidentDetail i={sel} canAct={canAct} />}</div>
        </div>
      ) : <Empty title={closed ? "No closed incidents" : "No open incidents"}>{closed ? "Closed incidents are kept here with their evidence." : "When someone raises a concern it appears here first, with a deadline."}</Empty>}
      {!canActOnIncident(c.roles) && <Note tone="sand" icon="lock">You can see that incidents exist. Only the safeguarding lead can open what they say and act on them.</Note>}
    </AdminShell>
  );
}
