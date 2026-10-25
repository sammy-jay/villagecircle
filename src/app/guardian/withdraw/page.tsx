import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { guardianPage } from "@/lib/guardian-ctx";
import { guardianOverview, withdrawView } from "@/lib/safety-user";
import { WithdrawForm } from "./withdraw-form";

export const metadata = { title: "Withdraw consent" };
export const dynamic = "force-dynamic";

/** G4 Withdraw consent: confirm (state 1), then what happens next (state 2, `?done=1`). */
export default async function Withdraw({ searchParams }: { searchParams: { done?: string } }) {
  const r = await guardianPage("/guardian/withdraw");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const [w, o] = await Promise.all([withdrawView(c.userId), guardianOverview(c.userId)]);
  const shell = { name: c.name, of: c.kids.join(" and ") || undefined, approvals: c.needs, unread: c.unread };
  if (!w) redirect("/guardian");
  const mentor = o?.upcoming?.mentor ?? null;

  if (searchParams.done === "1") {
    const next = [`${mentor ?? "The mentor"} has been told kindly. They do not see why.`, "Our safeguarding lead will call you within one working day, between 9 am and 5 pm.", `Nothing has been deleted. ${w.first} can come back when you and the team agree.`, `${w.first} sees a calm note: Your guardian has paused things for now.`];
    return (
      <GuardianShell {...shell} phone={{ title: "Paused" }}>
        <section className="flex flex-col gap-3.5 rounded-panel border border-line bg-card p-5 lg:p-[30px]">
          <p className="text-[12.5px] font-extrabold tracking-[.05em] text-forest">DONE</p>
          <div className="flex items-center gap-3"><span className="flex size-12 shrink-0 -rotate-[5deg] items-center justify-center rounded-[16px] bg-mint text-mint-ink"><Icon name="check" size={24} strokeWidth={3} /></span><h1 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-.01em] lg:text-[30px]">{w.first}&apos;s connection is paused</h1></div>
          <p className="text-[15.5px] text-bark">Thank you for telling us. Here is what happens next:</p>
          <ul className="flex flex-col gap-2.5">{next.map((e) => <li key={e} className="flex items-start gap-3 text-[15.5px] leading-[1.45]"><span className="mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full bg-mint text-mint-ink"><Icon name="check" size={15} strokeWidth={3} /></span>{e}</li>)}</ul>
          <div className="flex flex-col gap-2.5 lg:flex-row"><Link href="/settings/contact" className="dc-btn dc-btn-primary h-[52px]"><Icon name="message" size={18} />Talk with the team</Link><Link href="/guardian" className="dc-btn dc-btn-soft h-[52px]">Back to overview</Link></div>
        </section>
      </GuardianShell>
    );
  }
  return (
    <GuardianShell {...shell} phone={{ back: "/guardian", title: "Withdraw consent" }}>
      <WithdrawForm participantId={w.participantId} first={w.first} mentor={mentor} />
    </GuardianShell>
  );
}
