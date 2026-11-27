import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/dc/icons";
import { mentorPage } from "@/lib/mentor-ctx";
import { orientationView } from "@/lib/mentor";
import { cn } from "@/lib/cn";
import { conductAction } from "../actions";
import { JoinShell } from "../mentor-kit";
import { OrientationVideos } from "./orientation-videos";

export const metadata = { title: "Before your first conversation" };
export const dynamic = "force-dynamic";

/** M15 / DK12 Orientation: the Code of Conduct, safeguarding orientation, and the enhanced check for mentors who chose under-18s. */
export default async function Orientation() {
  const r = await mentorPage("/mentor/orientation", "profile");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  if (c.gate === "STATUS" || c.gate === "APPLY") redirect(c.gate === "APPLY" ? "/mentor/apply" : "/mentor/application");
  const v = await orientationView(c.userId);
  if (!v) redirect("/mentor/application");
  const items = [v.conduct, v.orientation, ...(v.minors ? [v.screening === "CLEAR"] : [])];
  const done = items.filter(Boolean).length; const pct = Math.round((done / items.length) * 100);
  const aside = (
    <>
      <p className="flex gap-3 rounded-card bg-butter p-5 text-[14px] leading-normal text-butter-ink"><Icon name="heart" size={20} className="mt-px shrink-0" />Passing on an Ask is private and never counts against you.</p>
      <section className="rounded-card border border-line bg-card p-5"><h2 className="font-display text-[18px] font-extrabold">Need a hand?</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Reply to any email from the team and a real person answers.</p></section>
    </>
  );
  return (
    <JoinShell name={c.short} title="Orientation" aside={aside}>
      {c.gate === "ACTIVE" && <p role="status" className="flex items-center gap-2.5 rounded-[18px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />You are set up. <Link href="/mentor" className="underline">Go to your inbox</Link></p>}
      <section className="flex flex-col gap-4 rounded-[28px] bg-mint p-6 text-mint-ink lg:flex-row lg:items-center lg:gap-6 lg:px-8 lg:py-7">
        <div className="relative size-[96px] shrink-0 rounded-full" style={{ background: `conic-gradient(#2F6B4F ${pct * 3.6}deg, rgba(255,255,255,.7) 0)` }} role="img" aria-label={`${done} of ${items.length} done`}>
          <span className="absolute inset-[9px] flex items-center justify-center rounded-full bg-mint font-display text-[24px] font-extrabold">{pct}%</span>
        </div>
        <div className="flex-1">
          <p className="text-[12.5px] font-extrabold uppercase tracking-[.07em]">Before your first conversation</p>
          <h1 className="mt-1 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[38px]">Almost there, {c.first}</h1>
              <p className="mt-1.5 text-[15px] leading-normal">{done} of {items.length} done. No Asks reach you until these are done. Nothing is rushed. You have 30 days.</p>
        </div>
        <span className="self-start rounded-full bg-card px-3.5 py-2 text-[13.5px] font-bold text-ink">{v.daysLeft} days left</span>
      </section>

      <Step n={1} done={v.conduct} title="Read and accept the Code of Conduct" sub="Version 1.2. It takes about five minutes.">
        {v.conduct ? <p className="text-[14.5px] font-semibold text-forest">Accepted. Thank you.</p> : (
          <form action={conductAction} className="flex flex-col gap-3">
            <Link href="/policies/code-of-conduct" target="_blank" className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-clay"><Icon name="doc" size={17} />Read the Mentor Code of Conduct</Link>
            <label className="flex cursor-pointer items-start gap-3 text-[15px]"><input type="checkbox" name="accept" value="yes" required className="mt-0.5 size-[22px] accent-[#2F6B4F]" />I accept the Mentor Code of Conduct.</label>
            <button type="submit" className="dc-btn dc-btn-primary h-[52px] self-start"><Icon name="check" size={18} />Accept</button>
          </form>
        )}
      </Step>

      <Step n={2} done={v.orientation} title="Safeguarding orientation" sub="Watch four short recorded lessons, about 25 minutes in total.">
        <OrientationVideos completed={v.completedModules} orientationDone={v.orientation} />
        <p className="text-[13px] leading-normal text-stone">These are temporary video placeholders while the recordings are being prepared. Open each lesson and mark it watched to continue.</p>
        {v.orientation && <p className="text-[14.5px] font-semibold text-forest">All four lessons are complete. Thank you.</p>}
      </Step>

      {v.minors && (
        <Step n={3} done={v.screening === "CLEAR"} title="Enhanced check for 15 to 17s" sub="You chose to mentor younger people.">
          <p className="text-[14.5px] leading-normal text-bark">{v.screening === "CLEAR" ? "Your check is clear." : v.screening === "CONSIDER" ? "A member of the team will contact you about your check." : v.screening === "PENDING" ? "The check is pending. We will email you when it is done." : "The check starts once your application is approved. We will email you the link."}</p>
          {v.screening !== "CLEAR" && <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-butter px-3 py-1.5 text-[13px] font-semibold text-butter-ink"><Icon name="clock" size={15} />Check pending</span>}
        </Step>
      )}
      {v.minors && <p className="text-[13.5px] text-stone">Until all three are done you will not see Asks from under 18s. Adults can reach you once 1 and 2 are done.</p>}
      <Link href="/" className="dc-btn dc-btn-soft h-[52px] self-start">Continue later</Link>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </JoinShell>
  );
}

function Step({ n, done, title, sub, children }: { n: number; done: boolean; title: string; sub: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-card border bg-card p-5 lg:p-6", done ? "border-forest/40" : "border-line")}>
      <div className="flex items-start gap-3.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[16px] font-extrabold", done ? "bg-forest text-forest-ink" : "bg-sand")}>{done ? <Icon name="check" size={18} /> : n}</span>
        <div><h2 className="font-display text-[20px] font-extrabold leading-[1.15]">{title}</h2><p className="mt-0.5 text-[14px] text-bark">{sub}</p></div>
      </div>
      {children}
    </section>
  );
}
