import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, PanelHead, Pill, Ring, StatTile, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { overview } from "@/lib/admin-overview";
import { greeting } from "@/lib/domain/admin-overview";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";

export const metadata = { title: "Team console" };
export const dynamic = "force-dynamic";

const ACTION_TONE = { danger: "bg-blush text-blush-ink", warn: "bg-blush/70 text-blush-ink", clay: "bg-butter text-butter-ink", neutral: "border border-line bg-card" } as const;
const DOT = { danger: "bg-clay", warn: "bg-clay", clay: "bg-gold", neutral: "bg-forest" } as const;
const STAGES: [keyof { review: 0; matching: 0; scheduled: 0; done: 0; closed: 0 }, string, string][] = [["review", "In review", "bg-gold"], ["matching", "Finding a mentor", "bg-clay"], ["scheduled", "Scheduled", "bg-forest"], ["done", "Held and after", "bg-[#7FB38F]"], ["closed", "Closed", "bg-stone/60"]];

/** A3 Overview: what needs a person now (safety first), queue health, where Asks are, safeguarding and spot checks. */
export default async function AdminOverview({ searchParams }: { searchParams: { denied?: string } }) {
  const r = await adminPage("/admin");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const sees = (p: string) => c.perms.includes(p as never);
  const o = await overview(c.roles);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", hourCycle: "h23" }).format(now));
  const actions = o.actions.filter((a) => sees(a.href.startsWith("/admin/incidents") ? "safety.view" : a.href.startsWith("/admin/help") ? "help" : a.href.startsWith("/admin/moderation") ? "moderation" : a.href.startsWith("/admin/mentors") || a.href.startsWith("/admin/guardians") ? "applications.view" : "asks.view"));
  const first = actions[0];
  const pipeTotal = Math.max(1, ...STAGES.map(([k]) => o.pipeline[k] ?? 0));
  const trendMax = Math.max(1, ...o.trend.map((t) => t.n));
  const last7 = o.trend.slice(-7).reduce((n, t) => n + t.n, 0);
  const healthPct = o.health.total ? (o.health.onTime / o.health.total) * 100 : 100;

  return (
    <AdminShell ctx={c} phone={{ title: "Overview" }}>
      {searchParams.denied === "1" && <Note tone="blush" icon="lock">Your team role ({c.roleLabel}) does not open that page. Ask the program lead if you need it.</Note>}
      <section className="relative overflow-hidden rounded-[30px] bg-butter p-6 text-butter-ink lg:flex lg:items-center lg:gap-6 lg:px-8 lg:py-8">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-extrabold uppercase tracking-[.07em]">Overview · {day(now, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-.02em] lg:text-[46px]">{greeting(hour)}, {c.name.split(" ")[0]}</h1>
          <p className="mt-2 text-[16px]">{actions.length ? `${actions.length} ${actions.length === 1 ? "thing needs" : "things need"} you${actions.some((a) => a.key.startsWith("inc")) ? ", safety first" : ""}.` : "Nothing needs you right now."}</p>
          {first && <Link href={first.href} className={cn("dc-btn mt-4 h-[50px]", first.tone === "danger" ? "dc-btn-primary" : "dc-btn-forest")}><Icon name={first.tone === "danger" ? "alert" : "arrowRight"} size={18} />{first.key === "inc-overdue" ? "Open the late incident" : "Start with the first item"}</Link>}
        </div>
        <div className="mt-5 flex flex-col gap-3 lg:mt-0 lg:w-[310px]">
          <div className="rounded-[22px] bg-card/60 px-4 py-3.5">
            <p className="text-center text-[11.5px] font-extrabold uppercase tracking-[.07em]">Today so far</p>
            <dl className="mt-2 grid grid-cols-3 text-center">{([[o.today.released, "Asks released"], [o.today.decided, "Applications decided"], [o.today.thanksRead, "Items moderated"]] as const).map(([n, l]) => <div key={l}><dd className="font-display text-[26px] font-extrabold">{n}</dd><dt className="text-[11.5px] font-semibold leading-tight">{l}</dt></div>)}</dl>
          </div>
          <form action="/admin/search" role="search" className="flex h-12 items-center gap-2.5 rounded-full bg-card px-4 text-[15px]"><Icon name="search" size={18} className="text-stone" /><input name="q" type="search" aria-label="Search accounts, Asks, incidents" placeholder="Search accounts, Asks, incidents" className="min-w-0 flex-1 bg-transparent placeholder:text-stone focus:outline-none" /></form>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {sees("asks.view") && <StatTile tone="butter" icon="inbox" n={c.counts.asks} label="Asks to review" sub={`${o.counts.atRiskAsks} at risk`} href="/admin/asks" />}
        {sees("applications.view") && <StatTile tone="mint" icon="users" n={c.counts.mentors + c.counts.guardians} label="Applications waiting" sub={`${c.counts.mentors} mentors, ${c.counts.guardians} guardians`} href="/admin/mentors" />}
        {sees("asks.view") && <StatTile tone="blush" icon="shieldCheck" n={o.counts.awaitingGuardian} label="Waiting on a guardian" href="/admin/asks?filter=AWAITING_GUARDIAN" />}
        {sees("safety.view") && <StatTile tone="ink" icon="alert" n={o.counts.openIncidents} label="Open incidents" sub={o.counts.overdueIncidents ? `${o.counts.overdueIncidents} past window` : "All inside the window"} href="/admin/incidents" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Panel>
          <PanelHead title="Needs you now" right={<Pill tone="blush">{actions.length} item{actions.length === 1 ? "" : "s"}</Pill>} />
          {actions.length ? (
            <ul className="flex flex-col gap-2.5">
              {actions.slice(0, 6).map((a) => (
                <li key={a.key}><Link href={a.href} className={cn("flex items-center gap-3 rounded-[18px] px-4 py-3", ACTION_TONE[a.tone])}>
                  <span className={cn("size-2.5 shrink-0 rounded-full", DOT[a.tone])} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><b className="block text-[15px] leading-snug">{a.title}</b><span className="text-[13px] opacity-90">{a.detail}</span></span>
                  <Icon name="chevronRight" size={18} className="shrink-0 opacity-70" />
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-[14.5px] text-bark">All queues are clear. Thank you.</p>}
        </Panel>
        {sees("asks.view") ? (
          <section className="rounded-card bg-mint p-5 text-mint-ink lg:p-6">
            <h2 className="font-display text-[23px] font-extrabold">Queue health</h2>
            <div className="mt-3 flex flex-col items-center gap-3 text-center">
              <Ring pct={healthPct} size={140} color="#2F6B4F" track="#F8D9CB" label={`${Math.round(healthPct)}% on time`}><span className="flex flex-col"><span className="text-[34px]">{Math.round(healthPct)}%</span><span className="font-sans text-[12px] font-semibold">on time</span></span></Ring>
              <p className="text-[14.5px]">{o.health.onTime} of {o.health.total} Asks are inside the service window.</p>
              <div className="flex gap-2"><Pill tone="outline">{o.health.onTime} on time</Pill>{o.health.atRisk > 0 && <Pill tone="blush">{o.health.atRisk} at risk</Pill>}</div>
            </div>
            <dl className="mt-4 divide-y divide-mint-ink/15 text-[14px]">
              {([["Review window", `${o.health.reviewDays} business days`], ["Mentor reply window", `${o.health.replyDays} days`], ["Median review this month", o.health.medianReviewDays == null ? "No data yet" : `${o.health.medianReviewDays.toFixed(1)} days`]] as const).map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt>{k}</dt><dd className="font-bold">{v}</dd></div>)}
            </dl>
          </section>
        ) : <Panel><PanelHead title="Reports" href="/admin/reports" link="Open reports" /><p className="text-[14.5px] text-bark">Your role sees counts only. Reports show demand, matching and hours.</p></Panel>}
      </div>

      {sees("asks.view") && (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Panel>
            <PanelHead title="Where Asks are" href="/admin/asks/all" link="All Asks" />
            <ul className="flex flex-col gap-3">
              {STAGES.map(([k, l, bar]) => <li key={k} className="grid grid-cols-[130px_1fr_32px] items-center gap-3 text-[14.5px] lg:grid-cols-[140px_1fr_32px]"><span>{l}</span><span className="h-3 overflow-hidden rounded-full bg-sand"><span className={cn("block h-full rounded-full", bar)} style={{ width: `${((o.pipeline[k] ?? 0) / pipeTotal) * 100}%` }} /></span><b className="text-right">{o.pipeline[k] ?? 0}</b></li>)}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex justify-between text-[13.5px] text-bark"><span>Submitted, last 14 days</span><span><b className="text-ink">{last7}</b> in the last 7</span></div>
              <div className="mt-3 flex h-[110px] items-end gap-1.5" aria-hidden="true">
                {o.trend.map((t, i) => <span key={t.day} title={`${day(t.day)}: ${t.n}`} className={cn("flex-1 rounded-t-[4px]", i >= 7 ? "bg-forest" : "bg-[#A9C9B4]")} style={{ height: t.n ? `${Math.max(6, (t.n / trendMax) * 100)}%` : 2 }} />)}
              </div>
              <table className="sr-only"><caption>Asks submitted per day</caption><tbody>{o.trend.map((t) => <tr key={t.day}><th scope="row">{t.day}</th><td>{t.n}</td></tr>)}</tbody></table>
            </div>
          </Panel>
          <div className="flex flex-col gap-4">
            {sees("safety.view") && (
              <Panel>
                <PanelHead title="Safeguarding" href="/admin/incidents" link="Incidents" />
                {o.open.length ? (
                  <ul className="flex flex-col gap-2.5">
                    {o.open.map((i) => <li key={i.id}><Link href={`/admin/incidents/${i.id}`} className={cn("block rounded-[18px] px-4 py-3", i.countdown?.overdue ? "bg-blush text-blush-ink" : "bg-butter text-butter-ink")}><span className="flex items-center justify-between gap-2"><b className="text-[15px]">#{i.ref} · {i.category}</b><Pill tone="outline">{i.stateLabel}</Pill></span><span className="mt-1 block text-[13.5px] font-bold">{i.countdown?.label ?? ""}</span></Link></li>)}
                  </ul>
                ) : <p className="text-[14.5px] text-bark">No open incidents.</p>}
                <p className="mt-3 text-[13.5px] text-bark">Reports pause the connection first and ask questions second.</p>
              </Panel>
            )}
            {sees("applications.view") && (
              <Panel>
                <PanelHead title="Spot checks" href="/admin/guardians" link="Guardians" />
                <p className="text-[14px] text-bark">A random sample of authorizations is checked each week.</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {o.auths.length ? o.auths.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-line px-4 py-2.5"><span className="min-w-0"><b className="block text-[14.5px]">Authorized {day(a.at)}</b><span className="text-[12.5px] text-stone">Ask: {a.topic}</span></span><Pill tone="butter">To check</Pill></li>) : <li className="text-[14px] text-bark">No recent authorizations.</li>}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
