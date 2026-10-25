import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { listGuardianApprovals } from "@/lib/asks";
import { cn } from "@/lib/cn";

export const metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { AWAITING_GUARDIAN: "Authorize the Ask", CONNECTION_APPROVED: "Approve the mentor and time", SCHEDULED: "Booked" };

/** G2 list: every Ask that needs, or recently needed, the guardian. */
export default async function Approvals({ searchParams }: { searchParams: { done?: string } }) {
  const r = await guardianPage("/guardian/approvals");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const list = (await listGuardianApprovals(c.userId)) ?? [];
  const now = list.filter((a) => a.needsYou); const rest = list.filter((a) => !a.needsYou);
  const row = (a: (typeof list)[number]) => (
    <Link key={a.id} href={`/guardian/approvals/${a.id}`} className={cn("flex items-center gap-3.5 rounded-card bg-card p-[18px]", a.needsYou ? "border-2 border-clay" : "border border-line")}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", a.needsYou ? "bg-butter text-butter-ink" : "bg-mint text-mint-ink")}><Icon name={a.state === "AWAITING_GUARDIAN" ? "message" : a.state === "SCHEDULED" ? "calendar" : "users"} size={22} /></span>
      <div className="min-w-0 flex-1"><p className="text-[12px] font-extrabold uppercase tracking-[.05em] text-stone">{a.first}&apos;s {a.topic} Ask</p><p className="font-display text-[19px] font-extrabold leading-[1.15]">{a.needsYou ? LABEL[a.state] ?? "Needs you" : LABEL[a.state] ?? "Up to date"}</p></div>
      <span className={cn("whitespace-nowrap rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", a.needsYou ? "bg-butter text-butter-ink" : "bg-sand")}>{a.needsYou ? "Needs you" : "Done"}</span>
    </Link>
  );
  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} phone={{ title: "Approvals" }}
      aside={<Card className="p-5 text-[14px] leading-normal text-bark"><b className="text-ink">Three yeses, every time.</b> You authorize the Ask, then the mentor, then the time. Nothing is booked without all three.</Card>}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Approvals</h1><p className="mt-1 text-[16px] text-bark">You decide at each step. Nothing moves until you answer.</p></div>
      <h1 className="sr-only lg:hidden">Approvals</h1>
      {searchParams.done && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">{searchParams.done === "booked" ? "Approved. The call is booked and everyone has the details." : "Done. The team will suggest a different mentor."}</p>}
      <section className="flex flex-col gap-3"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Waiting on you</h2>{now.length ? now.map(row) : <Card className="p-5 text-[15px] text-bark">Nothing is waiting on you right now.</Card>}</section>
      {rest.length > 0 && <section className="flex flex-col gap-3"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Recently approved</h2>{rest.map(row)}</section>}
    </GuardianShell>
  );
}
