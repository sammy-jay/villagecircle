import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Panel, Person, Pill, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { helpList } from "@/lib/admin-data";
import { cn } from "@/lib/cn";
import { helpReplyAction } from "../safety-actions";

export const metadata = { title: "Help requests" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, "butter" | "mint" | "sand"]> = { NEW: ["New", "butter"], WAITING: ["Waiting", "sand"], REPLIED: ["Replied", "mint"] };

/** A29 Help requests: people asking the team for help. Safeguarding concerns skip this queue and go to the safeguarding lead. */
export default async function Help({ searchParams }: { searchParams: { id?: string; show?: string } }) {
  const r = await adminPage("/admin/help");
  if ("to" in r) redirect(r.to);
  const { list, detail } = await helpList(searchParams.id);
  const show = searchParams.show;
  const rows = show ? list.filter((x) => x.status === show) : list;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Help requests" }}>
      <AdminHead eyebrow="Safety" title="Help requests" sub="A real person replies within one working day." />
      <FilterPills items={[{ href: "/admin/help", label: "All", n: list.length, on: !show }, ...(["NEW", "WAITING", "REPLIED"] as const).map((s) => ({ href: `/admin/help?show=${s}`, label: STATUS[s]![0], n: list.filter((x) => x.status === s).length, on: show === s }))]} />
      {rows.length ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <ul className="flex flex-col gap-1 self-start rounded-card border border-line bg-card p-2">
            {rows.map((x) => (
              <li key={x.id}><Link href={`/admin/help?id=${x.id}${show ? `&show=${show}` : ""}`} aria-current={x.id === detail?.id ? "true" : undefined} className={cn("flex items-center gap-2 rounded-[18px] px-3 py-2.5", x.id === detail?.id ? "bg-sand" : "hover:bg-sand/60")}>
                <span className="min-w-0 flex-1"><Person name={x.from} size={36} tone={x.minor ? "blush" : "butter"} sub={`${x.about} · ${day(x.received)}`} /></span><Pill tone={STATUS[x.status]?.[1] ?? "sand"}>{STATUS[x.status]?.[0] ?? x.status}</Pill>
              </Link></li>
            ))}
          </ul>
          {detail && (
            <div className="flex min-w-0 flex-col gap-4">
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[21px] font-extrabold">{detail.from} · {detail.about}</h2><Pill tone={STATUS[detail.status]?.[1] ?? "sand"}>{STATUS[detail.status]?.[0] ?? detail.status}</Pill></div>
                <p className="mt-2 font-display text-[18px] leading-snug">&ldquo;{detail.message}&rdquo;</p>
                {detail.reply && <p className="mt-3 rounded-[16px] bg-mint px-4 py-3 text-[14.5px] text-mint-ink"><b>Your reply: </b>{detail.reply}</p>}
              </Panel>
              {detail.status !== "REPLIED" && (
                <Panel>
                  <ActionForm action={helpReplyAction} ok={{ reply: "Reply sent.", waiting: "Marked as waiting.", resend: "A new approval link was sent to the guardian's email." }}>
                    <input type="hidden" name="id" value={detail.id} />
                    <div><label htmlFor="reply" className="dc-label">Your reply</label><textarea id="reply" name="reply" rows={4} className="dc-textarea" placeholder="Plain words. No other person's details." /></div>
                    <div className="flex flex-wrap gap-2.5">
                      <Submit icon="send">Send reply</Submit>
                      {detail.canResend && <Submit name="intent" value="resend" variant="soft">Resend approval link</Submit>}
                      <Submit name="intent" value="waiting" variant="ghost">Mark as waiting</Submit>
                    </div>
                  </ActionForm>
                </Panel>
              )}
            </div>
          )}
        </div>
      ) : <Empty title="No help requests">Messages from the Contact the team form appear here.</Empty>}
      <Note tone="mint" icon="shieldCheck">Safeguarding concerns skip this queue and go straight to the safeguarding lead.</Note>
    </AdminShell>
  );
}
