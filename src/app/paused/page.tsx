import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { ButtonLink, initials } from "@/components/dc";
import { BarShell, HelpLink, PhoneBar } from "@/components/account/shells";
import { participantPage } from "@/lib/participant-ctx";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";

export const metadata = { title: "Your account is paused" };
export const dynamic = "force-dynamic";

const TONE = { butter: "bg-butter text-butter-ink", blush: "bg-blush text-blush-ink", mint: "bg-mint text-mint-ink" };

/** M25 Account paused: the calm page a young person sees after their guardian pauses a connection. */
export default async function Paused() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/paused" : r.to);
  const c = r.ctx;
  if (c.status !== "PAUSED") redirect("/home");

  const prof = await db.participantProfile.findUnique({ where: { userId: c.userId } });
  const held = prof ? await db.ask.count({ where: { participantId: prof.id, pausedForCrisis: true } }) : 0;
  const cancelled = prof ? await db.connection.count({ where: { ask: { participantId: prof.id }, status: "CANCELLED", pausedByConcern: true } }) : 0;
  const link = prof ? await db.guardianLink.findFirst({ where: { participantId: prof.id }, include: { guardian: { include: { user: true } } }, orderBy: { createdAt: "desc" } }) : null;
  const gf = link?.guardian.user.name.split(" ")[0] ?? "your guardian";

  const rows: [IconName, keyof typeof TONE, string, string, string][] = [
    ["inbox", "butter", "Open Asks", held ? `${held}, saved as they are` : "None right now", "On hold"],
    ...(cancelled ? [["calendar", "blush", cancelled === 1 ? "Booked conversation" : `${cancelled} booked conversations`, "Cancelled, mentor told kindly", "Cancelled"] as [IconName, keyof typeof TONE, string, string, string]] : []),
    ["book", "mint", "Library and events", "Still available to you", "Open"],
  ];
  const onHold = (
    <section className="rounded-card border border-line bg-card p-5 lg:p-6">
      <h2 className="mb-0 font-display text-[20px] font-extrabold leading-[1.02] tracking-[-.02em] lg:mb-1 lg:text-[22px]">What is on hold</h2>
      <ul>
        {rows.map(([icon, tone, t, s, tag], i) => (
          <li key={t} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
            <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", TONE[tone])}><Icon name={icon} size={23} /></span>
            <div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{t}</p><p className="mt-0.5 text-[13.5px] text-stone">{s}</p></div>
            <span className={cn("whitespace-nowrap rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", TONE[tone])}>{tag}</span>
          </li>
        ))}
      </ul>
    </section>
  );
  const resumes = <div className="flex gap-3 rounded-[20px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="clock" size={24} className="shrink-0" /><p><b>How it resumes.</b> Your guardian can resume with our team when they are ready. We will tell you straight away.</p></div>;
  const avatar = <span className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink">{initials(c.name)}</span>;

  return (
    <BarShell max={1120} right={<><HelpLink />{avatar}</>} phone={{ title: " " }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-7">
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
          <section className="rounded-[30px] bg-mint p-[26px] text-mint-ink lg:rounded-[36px] lg:px-11 lg:py-10">
            <span className="flex size-14 -rotate-[5deg] items-center justify-center rounded-[18px] bg-card lg:size-16 lg:rounded-[21px]"><Icon name="pause" size={28} className="lg:hidden" /><Icon name="pause" size={32} className="max-lg:hidden" /></span>
            <h1 className="mt-3.5 font-display text-[34px] font-extrabold leading-[1.04] lg:mt-[18px] lg:text-[56px] lg:leading-none lg:tracking-[-.02em]">Your account is paused</h1>
            <p className="mt-2 max-w-[560px] text-[15.5px] leading-normal lg:mt-3 lg:text-[18px]">Your guardian paused it. Nothing has been deleted and you did nothing wrong.</p>
          </section>
          <p className="text-[15.5px] leading-normal text-bark lg:hidden">The best next step is to talk with {gf}. If you do not feel able to, you can speak with our team.</p>
          <section className="rounded-card border border-line bg-card p-7 max-lg:hidden">
            <h2 className="font-display text-[24px] font-extrabold leading-[1.02] tracking-[-.02em]">The best next step is to talk with {gf}.</h2>
            <p className="mt-1.5 text-[16px] leading-normal text-bark">If you do not feel able to, you can speak with our team.</p>
            <div className="mt-4 flex gap-3">
              <ButtonLink href="/help#contact" variant="primary" icon="message" className="h-[54px]">Talk to the team</ButtonLink>
              <ButtonLink href="/faq#paused" variant="ghost" className="h-[54px]">Read what this means</ButtonLink>
            </div>
          </section>
          <div className="lg:hidden">{onHold}</div>
          <div className="lg:hidden">{resumes}</div>
        </div>
        <div className="flex flex-col gap-5 max-lg:hidden lg:w-[420px] lg:flex-none">{onHold}{resumes}</div>
      </div>
      <PhoneBar>
        <ButtonLink href="/help#contact" variant="primary" icon="message" className="h-14 w-full">Talk to the team</ButtonLink>
        <Link href="/faq#paused" className="mt-3 block text-center text-[14.5px] font-bold">Read what this means</Link>
      </PhoneBar>
    </BarShell>
  );
}
