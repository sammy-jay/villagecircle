import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, PanelHead, Pill } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { getConfig } from "@/lib/config";
import { configAudit, taxonomyList, topicDetail } from "@/lib/admin-ops";
import { TEMPLATES } from "@/lib/templates";
import { WEIGHT_KEYS, WEIGHT_LABEL, WINDOW_BOUNDS, WINDOW_LABEL, WINDOW_UNIT } from "@/lib/domain/admin-ops";
import { expertiseLabel } from "@/lib/domain/expertise";
import { configAction } from "../settings-actions";

export const metadata = { title: "Configuration" };
export const dynamic = "force-dynamic";

/** A5 Configuration: shortlist weights and service windows (new Asks only), with the topics, templates and recent changes at a glance. */
export default async function Config() {
  const r = await adminPage("/admin/config");
  if ("to" in r) redirect(r.to);
  const [cfg, topics, log] = await Promise.all([getConfig(), taxonomyList(), configAudit(5)]);
  const details = await Promise.all(topics.slice(0, 10).map((t) => topicDetail(t.slug)));
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Configuration" }}>
      <AdminHead eyebrow="Settings" title="Configuration" sub="Changes take effect for new Asks only, and every change is recorded with before and after." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHead title="Shortlist weights" right={<Pill tone="sand">Total 100</Pill>} />
          <ActionForm action={configAction} ok="Saved. New shortlists use these weights.">
            {WEIGHT_KEYS.map((k) => <div key={k} className="flex items-center justify-between gap-3"><label htmlFor={`w_${k}`} className="text-[15px]">{WEIGHT_LABEL[k]}</label><input id={`w_${k}`} name={`w_${k}`} type="number" min={0} max={100} defaultValue={cfg.weights[k]} className="dc-input h-12 w-[96px] text-center" /></div>)}
            <p className="text-[13px] text-stone">The weights must add up to 100. The cleared-for-minors gate is fixed and cannot be turned off.</p>
            <Submit variant="forest" className="self-start">Save weights</Submit>
          </ActionForm>
        </Panel>
        <Panel>
          <PanelHead title="Service windows" />
          <ActionForm action={configAction} ok="Saved. New Asks use these windows.">
            {(Object.keys(WINDOW_LABEL) as (keyof typeof WINDOW_LABEL)[]).map((k) => <div key={k} className="flex items-center justify-between gap-3"><label htmlFor={k} className="text-[15px]">{WINDOW_LABEL[k]}</label><span className="flex items-center gap-2"><input id={k} name={k} type="number" min={WINDOW_BOUNDS[k][0]} max={WINDOW_BOUNDS[k][1]} defaultValue={cfg.windows[k]} className="dc-input h-12 w-[84px] text-center" /><span className="w-[100px] text-[13.5px] text-bark">{WINDOW_UNIT[k]}</span></span></div>)}
            <Submit variant="forest" className="self-start">Save windows</Submit>
          </ActionForm>
        </Panel>
      </div>
      <Panel>
        <PanelHead title="Topic taxonomy" href="/admin/taxonomy" link="Edit topics" />
        <ul className="divide-y divide-line">{details.filter(Boolean).map((t) => <li key={t!.slug} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14.5px]"><b>{t!.name}</b><span className="text-bark">{t!.expertiseMap.map(expertiseLabel).join(", ") || "No area mapped"}</span><Pill tone={t!.active ? "mint" : "sand"}>{t!.active ? "Live" : "Off"}</Pill></li>)}</ul>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHead title="Message templates" href="/admin/templates" link="Open templates" />
          <ul className="divide-y divide-line">{TEMPLATES.map((t) => <li key={t.key} className="py-2.5"><Link href={`/admin/templates?key=${t.key}`} className="text-[14.5px] font-semibold hover:underline">{t.label}</Link><span className="block text-[12.5px] text-stone">{t.channel === "EMAIL" ? "Email" : "SMS"} · plain words, first names only</span></li>)}</ul>
        </Panel>
        <Panel>
          <PanelHead title="Recent changes" href="/admin/audit?object=Config" link="Open all" />
          {log.length ? <ul className="divide-y divide-line">{log.map((l) => <li key={l.id} className="py-2.5 text-[14px]"><span className="block">{l.who} {l.what}</span><span className="text-[12.5px] text-stone">{l.when}</span></li>)}</ul> : <p className="text-[14.5px] text-bark">No changes yet.</p>}
        </Panel>
      </div>
      <Note tone="sand" icon="lock">Only the program lead can change configuration and templates.</Note>
    </AdminShell>
  );
}
