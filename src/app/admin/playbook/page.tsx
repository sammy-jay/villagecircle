import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { playbookContext } from "@/lib/admin-ops";
import { cn } from "@/lib/cn";
import { decisionAction } from "../asks-actions";

export const metadata = { title: "Reviewer playbook" };
export const dynamic = "force-dynamic";

/** A24 Reviewer playbook: what to do at each review step, with the Ask beside it when one is open, and the two safety exits (freeze, redirect). */
export default async function Playbook({ searchParams }: { searchParams: { ask?: string; step?: string } }) {
  const r = await adminPage("/admin/playbook");
  if ("to" in r) redirect(r.to);
  const p = await playbookContext(searchParams.ask && /^[0-9a-f]{24}$/i.test(searchParams.ask) ? searchParams.ask : undefined, searchParams.step);
  const href = (step: string) => `/admin/playbook?${new URLSearchParams({ ...(p.ask ? { ask: p.ask.id } : {}), step })}`;
  const g = p.guide;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Playbook" }}>
      <AdminHead eyebrow="Settings" title={p.ask ? `Review: ${p.ask.title}` : "Reviewer playbook"} sub={`Step ${p.step} of F · ${g.title}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {p.ask && (
            <Panel>
              <p className="text-[12px] font-extrabold uppercase tracking-[.07em] text-bark">The Ask · {p.ask.reason}</p>
              <p className="mt-2 font-display text-[19px] leading-snug">&ldquo;{p.ask.question}&rdquo;</p>
              <Link href={`/admin/asks/${p.ask.id}`} className="mt-3 inline-block text-[14px] font-bold text-clay">Open in review ›</Link>
            </Panel>
          )}
          <Panel>
            <p className="text-[12px] font-extrabold uppercase tracking-[.07em] text-clay">Step {p.step}</p>
            <h2 className="mt-1 font-display text-[23px] font-extrabold">What to do</h2>
            <p className="mt-1.5 text-[15.5px] leading-normal">{g.todo}</p>
            {g.refer && <><h3 className="mt-4 text-[16px] font-extrabold">{g.refer.head}</h3><p className="mt-1 text-[15px] leading-normal text-bark">{g.refer.text}</p></>}
            {g.example && <><h3 className="mt-4 text-[16px] font-extrabold">Example of a good note</h3><p className="mt-1 rounded-[16px] bg-sand px-4 py-3 text-[15px] leading-normal">{g.example}</p></>}
          </Panel>
          <Note tone="blush" icon="alert"><b>Escalate when:</b> {g.escalate}</Note>
          {p.ask && r.ctx.perms.includes("asks.triage") && (
            <div className="grid gap-3 lg:grid-cols-2">
              <Panel>
                <h3 className="font-display text-[18px] font-extrabold">Freeze it</h3>
                <ActionForm action={decisionAction} ok="Frozen and escalated to a senior reviewer." confirm="Freeze this Ask and escalate it?"><input type="hidden" name="askId" value={p.ask.id} /><input type="hidden" name="decision" value="FLAG" /><input name="note" className="dc-saymore" placeholder="What did you see? (kept for the team)" aria-label="What you saw" /><Submit variant="outline" icon="pause" className="self-start">Freeze Ask</Submit></ActionForm>
              </Panel>
              {r.ctx.perms.includes("asks.release") && (
                <Panel>
                  <h3 className="font-display text-[18px] font-extrabold">Close as Redirected</h3>
                  <ActionForm action={decisionAction} ok="Closed with your note." confirm="Close this Ask as redirected? The participant reads your note."><input type="hidden" name="askId" value={p.ask.id} /><input type="hidden" name="decision" value="REDIRECT" /><textarea name="note" rows={2} className="dc-textarea" placeholder="A kind note, for example: needs a licensed professional" aria-label="Note to the participant" /><Submit variant="soft" className="self-start">Close as Redirected</Submit></ActionForm>
                </Panel>
              )}
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-3 self-start">
          <Panel className="p-4 lg:p-4">
            <h2 className="mb-2 font-display text-[18px] font-extrabold">Review steps</h2>
            <ol className="flex flex-col gap-1">
              {p.steps.map((s) => (
                <li key={s.letter}><Link href={href(s.letter)} aria-current={s.state === "now" ? "step" : undefined} className={cn("flex items-center gap-3 rounded-[14px] px-3 py-2 text-[14.5px]", s.letter === p.step ? "bg-butter font-bold text-butter-ink" : "hover:bg-sand")}>
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold", s.state === "done" ? "bg-forest text-forest-ink" : s.letter === p.step ? "bg-clay text-clay-ink" : "bg-sand")}>{s.state === "done" ? <Icon name="check" size={14} /> : s.letter}</span>{s.label}
                </Link></li>
              ))}
            </ol>
          </Panel>
          {!p.ask && <p className="px-1 text-[13.5px] text-stone">Open the playbook from an Ask review to see that Ask beside the guide.</p>}
        </aside>
      </div>
    </AdminShell>
  );
}
