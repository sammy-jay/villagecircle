import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, KV, Note, Panel, Person, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { guardianApplication, guardianQueue, type GuardianTab } from "@/lib/admin-applications-view";
import { GUARDIAN_FLAG_REASONS } from "@/lib/domain/admin-reasons";
import { cn } from "@/lib/cn";
import { checkAction, guardianDecisionAction } from "../applications-actions";

export const metadata = { title: "Guardian authorizations" };
export const dynamic = "force-dynamic";

const TABS: [GuardianTab, string][] = [["WAITING", "Spot check"], ["VERIFIED", "Verified"], ["NO_RESPONSE", "No response, 14 days"]];
const CHECKS: [string, string][] = [["g0", "Name and relationship look consistent with the account"], ["g1", "Second-factor check passed"], ["g2", "Guidelines version is current"], ["g3", "Spot check: confirmed by a short call from a team member"]];

/** A6 Guardian authorizations: nothing activates on its own. The team spot-checks, then activates or flags. */
export default async function Guardians({ searchParams }: { searchParams: { tab?: string; id?: string } }) {
  const r = await adminPage("/admin/guardians");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const tab = (TABS.find(([t]) => t === searchParams.tab)?.[0] ?? "WAITING") as GuardianTab;
  const q = await guardianQueue(tab);
  const selId = tab !== "NO_RESPONSE" ? searchParams.id ?? q.rows[0]?.id : undefined;
  const g = selId ? await guardianApplication(selId) : null;
  const can = c.perms.includes("guardians.decide");
  const href = (t: GuardianTab, id?: string) => `/admin/guardians?${new URLSearchParams({ ...(t !== "WAITING" ? { tab: t } : {}), ...(id ? { id } : {}) })}`;
  return (
    <AdminShell ctx={c} phone={{ title: "Guardians" }}>
      <AdminHead eyebrow="Applications" title="Guardian authorizations" sub="Nothing activates on its own. Check, then confirm or flag." />
      <FilterPills items={TABS.map(([t, l]) => ({ href: href(t), label: `${l} (${q.counts[t]})`, on: t === tab }))} />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-3">
          {q.rows.length ? (
            <ul className="flex flex-col gap-1 rounded-card border border-line bg-card p-2">
              {q.rows.map((x) => (
                <li key={x.id}>{tab === "NO_RESPONSE" ? <div className="px-3 py-2.5"><Person name={`${x.guardian}, for ${x.young}`} tone="blush" sub={<>Link sent {day(x.at)}<br />No response, 14 days</>} /></div>
                  : <Link href={href(tab, x.id)} aria-current={x.id === selId ? "true" : undefined} className={cn("block rounded-[18px] px-3 py-2.5", x.id === selId ? "border border-ink/20 bg-sand" : "hover:bg-sand/60")}><Person name={`${x.guardian}, for ${x.young}`} tone="butter" sub={<>Authorized {day(x.at)}<br />{x.state === "APPROVED" ? "Verified" : "Spot check pending"}</>} /></Link>}</li>
              ))}
            </ul>
          ) : <Empty title="Nothing here">{tab === "WAITING" ? "No authorizations are waiting for a check." : "Nothing in this list."}</Empty>}
          <Note tone="mint" icon="refresh">A random sample of authorizations is checked each week. A missing response after 14 days is chased by the team.</Note>
        </div>
        {g ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3"><Person name={g.guardian?.name ?? "Guardian"} size={60} sub={`Guardian of ${g.young.name}${g.young.age != null ? `, age ${g.young.age}` : ""}`} /><Pill tone={g.state === "APPROVED" ? "mint" : "butter"}>{g.state === "APPROVED" ? "Verified" : "V-GUARD · spot check"}</Pill></div>
            <Panel className="py-2 lg:py-2"><KV rows={[["Relationship", g.relationship], ["Verification", `${g.method}, passed ${day(g.submittedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`], ["Attendance preference", g.preference], ["Guidelines accepted", g.guidelines], ["Authorization record", "Kept for the life of the account and the statutory period"]]} /></Panel>
            <Panel>
              <h2 className="font-display text-[21px] font-extrabold">Reviewer checklist</h2>
              <div className="mt-3 flex flex-col gap-3">
                {CHECKS.map(([k, l]) => { const on = !!g.checklist[k]; return (
                  <form key={k} action={checkAction} className="flex items-center gap-3"><input type="hidden" name="id" value={g.id} /><input type="hidden" name="item" value={k} /><input type="hidden" name="on" value={on ? "0" : "1"} />
                    <button type="submit" disabled={!can} aria-pressed={on} aria-label={l} className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-check border-2 disabled:opacity-50", on ? "border-forest bg-forest text-forest-ink" : "border-line")}>{on && <Icon name="check" size={16} strokeWidth={3} />}</button><span className="text-[15px]">{l}</span></form>
                ); })}
              </div>
            </Panel>
            {can && g.state !== "APPROVED" && (
              <Panel>
                <h2 className="font-display text-[21px] font-extrabold">Your decision</h2>
                <ActionForm action={guardianDecisionAction} className="mt-3" ok={{ activated: "Confirmed. The young person's account is open and the family is emailed.", flagged: "Flagged for follow-up. Nothing activates until the team clears it." }}>
                  <input type="hidden" name="id" value={g.id} />
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div><p className="dc-label">Spot check method</p><Select name="method" defaultValue="Short call from a team member" options={["Short call from a team member", "Reply to our email", "Not sampled this week"].map((x) => ({ value: x, label: x }))} /></div>
                    <div><p className="dc-label">Reason, if you flag</p><Select name="reason" placeholder="Not needed to confirm" options={GUARDIAN_FLAG_REASONS.map(([v, l]) => ({ value: v, label: l }))} /></div>
                  </div>
                  <div><label htmlFor="g-note" className="dc-label">Note</label><textarea id="g-note" name="note" rows={2} className="dc-textarea" placeholder="Say more (optional). Required if you flag." /></div>
                  <div className="flex flex-wrap gap-2.5"><Submit name="action" value="ACTIVATE_GUARDIAN" icon="check">Confirm and activate account</Submit><Submit name="action" value="HOLD_GUARDIAN" variant="outline" icon="flag">Flag for follow-up</Submit></div>
                </ActionForm>
              </Panel>
            )}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
