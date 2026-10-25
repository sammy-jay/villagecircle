import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { ButtonLink } from "@/components/dc";
import { SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { ParticipantShell } from "@/components/app/app-shell";
import { settingsPage } from "@/lib/settings-ctx";
import { turning18View } from "@/lib/safety-user";
import { turning18Action } from "@/app/account-actions";
import { cn } from "@/lib/cn";

export const metadata = { title: "Turning 18" };
export const dynamic = "force-dynamic";

const CHANGES: [IconName, string, string][] = [
  ["user", "Your guardian", "Stops seeing your Asks and conversations"],
  ["check", "Authorization", "You authorize your own Asks"],
  ["video", "Recordings", "You decide who can request them"],
];
const STAYS: [IconName, string, string][] = [
  ["clipboard", "Your Asks and notes", "All kept"],
  ["target", "Your goals", "All kept"],
  ["users", "Your mentors", "Still your mentors"],
];

function List({ title, rows, tone }: { title: string; rows: [IconName, string, string][]; tone: "blush" | "mint" }) {
  const t = tone === "blush" ? "bg-blush text-blush-ink" : "bg-mint text-mint-ink";
  return (
    <section className="min-w-0 flex-1 rounded-card border border-line bg-card p-[18px] lg:rounded-panel lg:px-6 lg:pb-2.5 lg:pt-6">
      <span className={cn("inline-flex whitespace-nowrap rounded-full px-[13px] py-[7px] text-[13px] font-semibold", t)}>{title}</span>
      <ul>
        {rows.map(([icon, h, s], i) => (
          <li key={h} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
            <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", t)}><Icon name={icon} size={23} /></span>
            <div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{h}</p><p className="mt-0.5 text-[13.5px] text-stone">{s}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** M17 Turning 18: what changes on the 18th birthday. "Got it" records that it was read and applies it once the day has come. */
export default async function Turning18() {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/turning-18" : r.to);
  if (r.ctx.role !== "PARTICIPANT") redirect("/settings");
  const v = await turning18View(r.ctx.userId);
  if (!v) redirect("/settings");

  const days = Math.max(0, Math.ceil((v.birthday.getTime() - Date.now()) / 86400_000));
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(v.birthday);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(v.birthday).toUpperCase();
  const toGo = v.adultNow ? "Happy birthday" : `${days} ${days === 1 ? "day" : "days"} to go`;
  const heading = v.adultNow ? "You are 18 now" : `You are turning 18 on ${date}`;
  const tellGuardian = <><b>We will also tell your guardian.</b> Authority ends automatically on your birthday.</>;
  const gotIt = (cls: string, variant: "forest" | "primary") => <SubmitButton form="t18" icon="check" variant={variant} className={cls} pendingText="Saving…">Got it</SubmitButton>;

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/settings", title: "Turning 18" }} aside={
      <>
        <div className="flex gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink"><Icon name="shieldCheck" size={24} className="shrink-0" /><p>{tellGuardian}</p></div>
        <section className="rounded-card border border-line bg-card p-[22px]">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.02] tracking-[-.02em]">Questions?</h2>
          <p className="mt-1.5 text-[14.5px] leading-normal text-bark">Talk to the team any time. We will explain it in plain words.</p>
          <ButtonLink href="/help#contact" variant="ghost" icon="message" className="mt-3 h-[46px]">Talk to the team</ButtonLink>
        </section>
      </>
    }>
      <form id="t18" action={async () => { "use server"; await turning18Action(); }} className="hidden" />
      <section className="flex items-center gap-7 rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[32px] lg:px-9 lg:py-8">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold tracking-[.05em] opacity-85 lg:text-[12.5px]"><span className="lg:hidden">{toGo.toUpperCase()}</span><span className="max-lg:hidden">A BIG ONE IS COMING</span></p>
          <h1 className="mt-2 font-display text-[34px] font-extrabold leading-[1.04] lg:text-[44px] lg:leading-[1.02] lg:tracking-[-.02em]">{heading}</h1>
          <p className="mt-2 max-w-[520px] text-[15.5px] leading-normal lg:mt-2.5 lg:text-[17px]">Your account grows up with you. Here is what changes and what stays.</p>
        </div>
        <div className="min-w-[130px] rounded-card bg-card p-[18px] text-center shadow-[0_14px_30px_rgba(40,30,10,.10)] max-lg:hidden" style={{ transform: "rotate(4deg)" }}>
          <p className="text-[12px] font-extrabold tracking-[.05em] text-clay">{month}</p>
          <p className="font-display text-[64px] font-extrabold leading-none text-ink">{v.birthday.getDate()}</p>
          <p className="mt-1 text-[13px] text-stone">{toGo}</p>
        </div>
      </section>
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:gap-5">
        <List title="What changes" rows={CHANGES} tone="blush" />
        <List title="What stays the same" rows={STAYS} tone="mint" />
      </div>
      <div className="flex gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink lg:hidden"><Icon name="shieldCheck" size={24} className="shrink-0" /><p>{tellGuardian} You do not need to do anything.</p></div>
      <div className="flex items-center gap-4 max-lg:hidden">
        {gotIt("h-14", "forest")}
        <p className="text-[15px] leading-normal text-bark">You do not need to do anything.</p>
      </div>
      <PhoneBar>{gotIt("h-14 w-full", "primary")}</PhoneBar>
    </ParticipantShell>
  );
}
