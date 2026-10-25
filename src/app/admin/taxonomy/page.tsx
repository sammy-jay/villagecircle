import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Pill } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { taxonomyList, topicDetail } from "@/lib/admin-ops";
import { EXPERTISE } from "@/lib/domain/expertise";
import { cn } from "@/lib/cn";
import { topicSaveAction } from "../content-actions";

export const metadata = { title: "Taxonomy" };
export const dynamic = "force-dynamic";

/** A12 Taxonomy: Ask topics with their guided prompts and sub-topics, mapped to the stable expertise codes. Topics are deactivated, never deleted. */
export default async function Taxonomy({ searchParams }: { searchParams: { topic?: string; new?: string } }) {
  const r = await adminPage("/admin/taxonomy");
  if ("to" in r) redirect(r.to);
  const topics = await taxonomyList();
  const isNew = searchParams.new === "1";
  const slug = isNew ? null : searchParams.topic ?? topics[0]?.slug ?? null;
  const t = slug ? await topicDetail(slug) : null;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Taxonomy" }}>
      <AdminHead eyebrow="Content" title="Taxonomy" sub="Topics people Ask about, and the areas of expertise they map to." />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2 self-start">
          <ul className="flex flex-col gap-1 rounded-card border border-line bg-card p-2">
            {topics.map((x) => <li key={x.slug}><Link href={`/admin/taxonomy?topic=${x.slug}`} aria-current={x.slug === slug ? "true" : undefined} className={cn("flex items-center justify-between gap-2 rounded-[16px] px-3 py-2.5 text-[14.5px]", x.slug === slug ? "bg-sand font-bold" : "hover:bg-sand/60")}>{x.name}{!x.active && <Pill tone="sand">Off</Pill>}</Link></li>)}
          </ul>
          <Link href="/admin/taxonomy?new=1" className="dc-btn dc-btn-soft h-11"><Icon name="plus" size={17} />Add a topic</Link>
        </div>
        <Panel>
          <div className="flex items-center justify-between gap-2"><h2 className="font-display text-[22px] font-extrabold">{t ? t.name : "New topic"}</h2>{t && <Pill tone={t.active ? "mint" : "sand"}>{t.active ? "Active" : "Inactive"}</Pill>}</div>
          <ActionForm key={slug ?? "new"} action={topicSaveAction} className="mt-3" ok="Saved. New Asks pick up changes straight away.">
            {t && <input type="hidden" name="slug" value={t.slug} />}
            <div className="grid gap-3 lg:grid-cols-[1fr_200px]">
              <div><label htmlFor="name" className="dc-label">Topic name</label><input id="name" name="name" defaultValue={t?.name} className="dc-input" /></div>
              <div><p className="dc-label">Status</p><Select name="active" defaultValue={t?.active === false ? "no" : "yes"} options={[{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }]} /></div>
            </div>
            <fieldset><legend className="dc-label">Guided prompts</legend><div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <input key={i} name={`p${i + 1}`} defaultValue={t?.guidedPrompts[i] ?? ["What do you most want to understand or decide?", "Where are you right now?", "What would help most?"][i]} aria-label={`Prompt ${i + 1}`} className="dc-input" />)}</div></fieldset>
            <div><label htmlFor="sub" className="dc-label">Sub-topics (comma separated)</label><input id="sub" name="subTopics" defaultValue={t?.subTopics.join(", ")} placeholder="Choosing a course, Applying, Paying for it" className="dc-input" /></div>
            <fieldset><legend className="dc-label">Maps to expertise</legend>
              <div className="flex flex-wrap gap-1.5">{EXPERTISE.map(([code, label]) => <label key={code} className="cursor-pointer"><input type="checkbox" name="expertise" value={code} defaultChecked={t?.expertiseMap.includes(code)} className="peer sr-only" /><span className="inline-block rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold peer-checked:bg-forest peer-checked:text-forest-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink" title={label}>{code}</span></label>)}</div>
              <span className="dc-hint">Choose from the expertise list below. Codes stay the same if labels change.</span>
            </fieldset>
            <Submit className="self-start">Save topic</Submit>
          </ActionForm>
        </Panel>
      </div>
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Areas of expertise (stable codes)</h2>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">{EXPERTISE.map(([code, label]) => <li key={code} className="flex gap-2 text-[14px]"><span className="w-[70px] shrink-0 font-mono text-[12.5px] font-bold text-bark">{code}</span>{label}</li>)}</ul>
      </Panel>
      <Note tone="sand" icon="info">Labels can be reworded without breaking reports. &ldquo;Other&rdquo; answers are reviewed monthly and recurring ones become new categories. Adding an area of expertise is a code change, so ask the developers.</Note>
    </AdminShell>
  );
}
