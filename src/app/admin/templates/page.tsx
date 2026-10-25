import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Pill } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { cn } from "@/lib/cn";
import { templateSaveAction, templateTestAction } from "../content-actions";
import { TemplateEditor } from "./editor";

export const metadata = { title: "Email and SMS" };
export const dynamic = "force-dynamic";

/** P05 Email and SMS templates: the team edits the words; the placeholders and safety rules stay in code. */
export default async function Templates({ searchParams }: { searchParams: { key?: string; channel?: string } }) {
  const r = await adminPage("/admin/templates");
  if ("to" in r) redirect(r.to);
  const list = TEMPLATES.filter((t) => !searchParams.channel || t.channel === searchParams.channel);
  const states = await Promise.all(TEMPLATES.map(async (t) => [t.key, (await getTemplate(t.key))!] as const));
  const key = TEMPLATES.find((t) => t.key === searchParams.key)?.key ?? list[0]?.key ?? TEMPLATES[0]!.key;
  const def = TEMPLATES.find((t) => t.key === key)!;
  const cur = states.find(([k]) => k === key)![1];
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Email and SMS" }}>
      <AdminHead eyebrow="Content" title="Email and SMS" sub="Edit the words people receive. Placeholders and safety rules are fixed, so nothing unsafe can be sent." />
      <nav aria-label="Channel" className="flex gap-2 text-[14px] font-bold">{[["", "Any channel"], ["EMAIL", "Email"], ["SMS", "SMS"]].map(([v, l]) => <Link key={v} href={v ? `/admin/templates?channel=${v}` : "/admin/templates"} aria-current={(searchParams.channel ?? "") === v ? "page" : undefined} className={cn("rounded-full px-3.5 py-2", (searchParams.channel ?? "") === v ? "bg-forest text-forest-ink" : "bg-sand")}>{l}</Link>)}</nav>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <ul className="flex flex-col gap-1 self-start rounded-card border border-line bg-card p-2">
          {list.map((t) => { const edited = states.find(([k]) => k === t.key)![1].edited; return (
            <li key={t.key}><Link href={`/admin/templates?${new URLSearchParams({ ...(searchParams.channel ? { channel: searchParams.channel } : {}), key: t.key })}`} aria-current={t.key === key ? "true" : undefined} className={cn("block rounded-[16px] px-3 py-2.5", t.key === key ? "bg-sand" : "hover:bg-sand/60")}>
              <b className="block text-[14.5px]">{t.label}</b><span className="flex items-center gap-1.5 text-[12.5px] text-stone">{t.audience} · {t.channel === "EMAIL" ? "Email" : "SMS"}{edited && <Pill tone="butter" className="py-0.5">Edited</Pill>}</span>
            </Link></li>
          ); })}
        </ul>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-[23px] font-extrabold">{def.label}</h2><Pill tone="outline">{def.channel === "EMAIL" ? "Email" : "SMS"}</Pill><span className="text-[13.5px] text-stone">{def.channel === "EMAIL" ? `Goes to: ${def.audience}` : `Sent from: ${def.audience}`}</span>{cur.edited && <Pill tone="butter">Edited</Pill>}</div>
          <TemplateEditor key={key} tkey={key} initial={cur.parts} save={templateSaveAction} test={templateTestAction} />
        </div>
      </div>
    </AdminShell>
  );
}
