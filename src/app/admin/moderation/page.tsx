import Link from "next/link";
import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, KV, Note, Panel, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { moderationDetail, moderationQueue } from "@/lib/admin-village";
import { cn } from "@/lib/cn";
import { moderateAction } from "../safety-actions";

export const metadata = { title: "Moderation" };
export const dynamic = "force-dynamic";

const KINDS: [string, string, "thanks" | "posts" | "resources"][] = [["THANKS", "Thanks", "thanks"], ["POST", "Community feed", "posts"], ["RESOURCE", "Resources", "resources"]];
const REASONS = ["Names or details inside", "Not about the village", "Unkind wording", "Consent missing", "Other"];

/** A10 Moderation: thanks, feed posts and resources wait here until a person approves them. Nothing is public before that. */
export default async function Moderation({ searchParams }: { searchParams: { kind?: string; id?: string } }) {
  const r = await adminPage("/admin/moderation");
  if ("to" in r) redirect(r.to);
  const q = await moderationQueue();
  const kind = KINDS.find(([k]) => k === searchParams.kind)?.[0];
  const items = kind ? q.items.filter((i) => i.kind === kind) : q.items;
  const sel = items.find((i) => i.id === searchParams.id) ?? items[0];
  const d = sel ? await moderationDetail(sel.kind, sel.id) : null;
  const href = (o: { kind?: string; id?: string; k?: string }) => `/admin/moderation?${new URLSearchParams({ ...((o.k ?? kind) ? { kind: o.k ?? kind! } : {}), ...(o.id ? { id: o.id } : {}) })}`;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Moderation" }}>
      <AdminHead eyebrow="Safety" title="Moderation" sub="Thanks, feed posts and resources wait here until a person approves them." />
      <FilterPills items={[{ href: "/admin/moderation", label: "All", n: q.items.length, on: !kind }, ...KINDS.map(([k, l, c]) => ({ href: `/admin/moderation?kind=${k}`, label: l, n: q.counts[c], on: kind === k }))]} />
      {items.length ? (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <ul className="flex flex-col gap-2 self-start">
            {items.map((i) => (
              <li key={i.id}><Link href={href({ id: i.id })} aria-current={i.id === sel?.id ? "true" : undefined} className={cn("block rounded-[20px] border bg-card px-4 py-3", i.id === sel?.id ? "border-ink/30 ring-2 ring-ink/10" : "border-line")}>
                <span className="flex items-center justify-between gap-2"><b className="text-[13px] text-bark">{i.label}</b><Pill tone={i.tag === "New" ? "butter" : "mint"}>{i.tag}</Pill></span>
                <span className="mt-1 line-clamp-2 block text-[14.5px]">{i.preview}</span><span className="mt-1 block text-[12px] text-stone">{day(i.createdAt)}</span>
              </Link></li>
            ))}
          </ul>
          {d ? (
            <div className="flex min-w-0 flex-col gap-4">
              <Panel>
                <p className="text-[13px] font-bold text-bark">{d.eyebrow}</p>
                {d.title && <h2 className="mt-1 font-display text-[22px] font-extrabold">{d.title}</h2>}
                <p className="mt-2 whitespace-pre-line font-display text-[19px] leading-snug">{d.kind === "THANKS" ? `"${d.body}"` : d.body}</p>
                {d.flags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{d.flags.map((f) => <Pill key={f} tone="blush" icon="alert">{f}</Pill>)}</div>}
              </Panel>
              <Panel className="py-2 lg:py-2"><KV rows={d.rows} /></Panel>
              <Panel>
                <ActionForm action={moderateAction} ok={{ APPROVE: "Approved. It is now public.", REJECT: "Rejected. The author is told the reason.", EDIT: "Edited and saved.", ANONYMISE: "Names removed.", REMOVE: "Removed." }}>
                  <input type="hidden" name="kind" value={d.kind} /><input type="hidden" name="id" value={d.id} />
                  {d.canSelfEdit && <div><label htmlFor="mod-body" className="dc-label">Edit the text (only if you press Edit)</label><textarea id="mod-body" name="body" rows={3} defaultValue={d.body} className="dc-textarea" /></div>}
                  <div><p className="dc-label">If rejecting, reason</p><Select name="reason" placeholder="Choose a reason" options={REASONS.map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", show: "always" }} /></div>
                  <div className="flex flex-wrap gap-2.5">
                    <Submit name="action" value="APPROVE" icon="check">Approve</Submit>
                    {d.canSelfEdit && <Submit name="action" value="EDIT" variant="soft" icon="pencil">Edit</Submit>}
                    {d.canAnonymise && <Submit name="action" value="ANONYMISE" variant="soft">Anonymise more</Submit>}
                    <Submit name="action" value="REJECT" variant="outline">Reject</Submit>
                  </div>
                </ActionForm>
              </Panel>
              <Note tone="butter" icon="info">Thanks are public and permanent once approved. Star ratings and leaderboards are deliberately not collected.</Note>
            </div>
          ) : null}
        </div>
      ) : <Empty title="Nothing to moderate">New thank-you notes, feed posts and resources appear here before anyone else sees them.</Empty>}
    </AdminShell>
  );
}
