import { Icon, type IconName } from "@/components/dc/icons";
import { ButtonLink } from "@/components/dc";
import { PhoneBar, SplitShell } from "@/components/account/shells";
import { DELETE_GRACE_DAYS } from "@/lib/domain/safety-user";
import { cn } from "@/lib/cn";

export const metadata = { title: "Signed out", robots: { index: false } };

const TIPS: [IconName, string, string, string, number][] = [
  ["logout", "bg-butter text-butter-ink", "Log out every time on a shared phone", "Family phone, school computer or cyber cafe: always press Log out when you finish.", -1.5],
  ["lock", "bg-mint text-mint-ink", "Say no when the browser offers to save your password", "Only save it on a device that is yours alone.", 1],
  ["shieldCheck", "bg-blush text-blush-ink", "Nobody from the village will ask for your password or code", "Not the team, not a mentor. If someone does, say no and tell us.", -0.8],
];

/** Days left on the deletion grace period, drawn as a ring. */
function Ring({ days, total, size }: { days: number; total: number; size: "sm" | "lg" }) {
  const pct = Math.max(0, Math.min(100, (days / total) * 100));
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full", size === "lg" ? "size-[84px]" : "size-[72px]")} style={{ background: `conic-gradient(currentColor 0 ${pct}%, rgba(255,255,255,.6) ${pct}% 100%)` }}>
      <div className={cn("flex flex-col items-center justify-center rounded-full leading-none", size === "lg" ? "size-[66px]" : "size-[54px]")} style={{ background: "var(--ring-bg)" }}>
        <span className={cn("font-display font-extrabold", size === "lg" ? "text-[29px]" : "text-[24px]")}>{days}</span>
        <span className={cn("font-bold", size === "lg" ? "text-[12px]" : "text-[10px]")}>{days === 1 ? "day" : "days"}</span>
      </div>
    </div>
  );
}

/**
 * P02 Signed out after 30 minutes of quiet. `?reason=deleted&until=<ISO date>` is P02-D2: the account is set to be deleted,
 * and logging in before `until` keeps it.
 */
export default function SignedOut({ searchParams }: { searchParams: { reason?: string; until?: string } }) {
  const deleted = searchParams.reason === "deleted";
  const until = searchParams.until && !Number.isNaN(Date.parse(searchParams.until)) ? new Date(searchParams.until) : new Date(Date.now() + DELETE_GRACE_DAYS * 86400_000);
  const days = Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400_000));
  const untilText = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(until);

  const tipsPhone = (
    <section className="rounded-card border border-line bg-card p-[18px] lg:hidden">
      <h2 className="font-display text-[20px] font-extrabold leading-[1.02] tracking-[-.02em]">Using a shared phone or computer?</h2>
      <ul>
        {TIPS.map(([icon, tone, t, s], i) => (
          <li key={t} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
            <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", tone)}><Icon name={icon} size={23} /></span>
            <div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{t}</p><p className="mt-0.5 text-[13.5px] text-stone">{s}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
  const art = (
    <div className="flex w-[500px] flex-col gap-[18px]">
      <p className="font-display text-[26px] font-extrabold text-butter-ink">Using a shared phone or computer?</p>
      {TIPS.map(([icon, tone, t, s, rot]) => (
        <div key={t} className="flex items-start gap-3.5 rounded-card bg-card px-5 py-[18px] shadow-[0_8px_24px_rgba(0,0,0,.06)]" style={{ transform: `rotate(${rot}deg)` }}>
          <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", tone)}><Icon name={icon} size={23} /></span>
          <div><p className="font-display text-[18px] font-extrabold leading-[1.2]">{t}</p><p className="mt-[3px] text-[14px] leading-[1.45] text-bark">{s}</p></div>
        </div>
      ))}
    </div>
  );
  const buttons = (
    <>
      <ButtonLink href="/login" variant="primary" iconRight="arrowRight" className="h-14 w-full lg:h-[58px] lg:w-auto lg:px-10">Log in</ButtonLink>
      <ButtonLink href="/" variant="ghost" className="h-12 w-full lg:h-[58px] lg:w-auto">Go to the home page</ButtonLink>
    </>
  );
  const tone = deleted ? "bg-butter text-butter-ink" : "bg-blush text-blush-ink";

  return (
    <SplitShell panel="butter" art={art} phone={{ title: "The Village Circle" }}>
      <div className="flex flex-col gap-3.5 lg:mt-14 lg:gap-[18px]">
        {/* Phone: one pastel card holds the icon, heading and line. Desktop: they sit on the page. */}
        <section className={cn("rounded-[30px] px-[22px] py-[26px] lg:rounded-none lg:bg-transparent lg:p-0 lg:text-ink", tone)}>
          <span className={cn("flex size-16 -rotate-[5deg] items-center justify-center rounded-[22px] bg-card lg:size-[84px] lg:rounded-[28px]", deleted ? "lg:bg-butter lg:text-butter-ink" : "lg:bg-blush lg:text-blush-ink")}>
            <Icon name={deleted ? "trash" : "clock"} size={32} className="lg:hidden" /><Icon name={deleted ? "trash" : "clock"} size={40} className="max-lg:hidden" />
          </span>
          <p className="mt-[18px] text-[13px] font-extrabold tracking-[.04em] text-clay max-lg:hidden">{deleted ? "ACCOUNT DELETION" : "SIGNED OUT"}</p>
          <h1 className={cn("mt-4 font-display font-extrabold leading-[1.05] lg:mt-[18px] lg:text-[50px] lg:leading-[1.02] lg:tracking-[-.02em]", deleted ? "text-[32px]" : "text-[34px]")}>{deleted ? "Your account is set to be deleted" : "You were signed out"}</h1>
          <p className="mt-2 text-[15.5px] leading-normal lg:mt-[18px] lg:text-[17.5px] lg:text-bark">
            {deleted ? `You have ${days} ${days === 1 ? "day" : "days"} to change your mind. Log in before then to keep your account.` : "For your safety we sign you out after 30 minutes of quiet."}
          </p>
        </section>
        {deleted ? (
          <div className="flex items-center gap-3.5 rounded-card bg-mint px-[18px] py-4 text-mint-ink [--ring-bg:rgb(var(--mint))] lg:gap-4 lg:bg-butter lg:px-5 lg:py-[18px] lg:text-butter-ink lg:[--ring-bg:rgb(var(--butter))]">
            <span className="lg:hidden"><Ring days={days} total={DELETE_GRACE_DAYS} size="sm" /></span>
            <span className="max-lg:hidden"><Ring days={days} total={DELETE_GRACE_DAYS} size="lg" /></span>
            <div>
              <p className="font-display text-[19px] font-extrabold lg:text-[22px]">{days} {days === 1 ? "day" : "days"} to change your mind</p>
              <p className="mt-0.5 text-[13.5px] lg:mt-[3px] lg:text-[14.5px]">Until {untilText}.<span className="max-lg:hidden"> Log in before then and nothing is deleted.</span></p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 rounded-[22px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink">
            <Icon name="check" size={24} className="shrink-0" />
            <div><p className="mb-[3px] font-display text-[17px] font-extrabold">Nothing is lost</p>Your draft is saved. It resumes for 30 days.</div>
          </div>
        )}
        {tipsPhone}
        <div className="mt-1.5 flex gap-3 max-lg:hidden">{buttons}</div>
        <p className="text-[12.5px] leading-[1.4] text-stone max-lg:hidden">Not you? Just close this tab. Nobody can see your account from here.</p>
      </div>
      <PhoneBar className="pb-4"><div className="flex flex-col gap-2">{buttons}</div></PhoneBar>
    </SplitShell>
  );
}
