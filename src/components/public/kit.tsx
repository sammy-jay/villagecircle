import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/dc/icons";

/*
 * Building blocks for the public site boards (HP1-HP10, Main, P1, PO-1).
 * Desktop boards are 1280 wide with 56px gutters; phone boards are 390 wide with 16px gutters.
 * Everything switches at `lg`.
 */

export type Tone = "butter" | "mint" | "blush";
export const TONE: Record<Tone, { bg: string; ink: string; border: string }> = {
  butter: { bg: "bg-butter", ink: "text-butter-ink", border: "border-butter-ink" },
  mint: { bg: "bg-mint", ink: "text-mint-ink", border: "border-mint-ink" },
  blush: { bg: "bg-blush", ink: "text-blush-ink", border: "border-blush-ink" },
};
/** Boards cycle butter, mint, blush through repeated cards. */
export const cycle = (i: number): Tone => (["butter", "mint", "blush"] as const)[i % 3]!;

/** Page gutter: 16px on the phone, 56px on desktop, centred at the board width. */
/**
 * Vertical rhythm for public pages, matching the landing (HOME_Y in public/home.tsx).
 * PAGE_STACK goes on the Gutter that holds a page's sections: the gap is the space between sections, the padding sits under the last one.
 * SECTION_STACK goes on a section with a heading: the gap is the space between its heading and its content.
 */
export const PAGE_STACK = "flex flex-col gap-16 pb-12 lg:gap-32 lg:pb-24";
export const SECTION_STACK = "flex flex-col gap-7 lg:gap-12";

export function Gutter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 lg:px-14", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[13px] font-extrabold uppercase tracking-[.04em] text-clay", className)}>{children}</p>;
}

/** Bricolage 800 heading with the boards' tight leading. Size is a Tailwind text class pair. */
export function H({ as: As = "h2", className, children }: { as?: "h1" | "h2" | "h3" | "p"; className?: string; children: ReactNode }) {
  return <As className={cn("font-display font-extrabold leading-[1.12] tracking-[-.01em]", className)}>{children}</As>;
}

/** Outline tag ("Private", "Page not found", "For families"). */
export function OTag({ icon, children, className }: { icon?: IconName; children: ReactNode; className?: string }) {
  return <span className={cn("dc-otag", className)}>{icon && <Icon name={icon} size={14} />}{children}</span>;
}

type PillTone = "sand" | "forest" | Tone | "outline";
const PILL: Record<PillTone, string> = {
  sand: "bg-sand text-ink", forest: "bg-forest text-forest-ink", outline: "border-line bg-transparent",
  butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink",
};
export function Pill({ tone = "sand", icon, children, className }: { tone?: PillTone; icon?: IconName; children: ReactNode; className?: string }) {
  return <span className={cn("dc-pill", PILL[tone], className)}>{icon && <Icon name={icon} size={16} />}{children}</span>;
}

/** Rounded square holding an icon. White on pastel blocks, pastel on white cards. */
export function IconTile({ icon, tone, white, size = 46, iconSize, radius = 15, className }: { icon: IconName; tone: Tone; white?: boolean; size?: number; iconSize?: number; radius?: number; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center", white ? "bg-card" : TONE[tone].bg, TONE[tone].ink, className)} style={{ width: size, height: size, borderRadius: radius }}>
      <Icon name={icon} size={iconSize ?? Math.round(size / 2)} />
    </span>
  );
}

/** Numbered circle used for steps. */
export function NumberDot({ n, size = 44, className }: { n: number | string; size?: number; className?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-extrabold", className)} style={{ width: size, height: size, fontSize: size * 0.45 }}>{n}</span>;
}

/** Forest tick in a 28px circle, as in "What mentors are asked to sign". */
export function CheckDot({ size = 28, className }: { size?: number; className?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-forest text-forest-ink", className)} style={{ width: size, height: size }}><Icon name="check" size={Math.round(size * 0.55)} strokeWidth={3} /></span>;
}

export function CheckList({ items, className, textClass = "text-[15.5px]" }: { items: ReactNode[]; className?: string; textClass?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((t, i) => <li key={i} className="flex items-start gap-3"><CheckDot className="-mt-0.5" /><span className={cn("leading-[1.45]", textClass)}>{t}</span></li>)}
    </ul>
  );
}

/** Story-ring avatar: clay-to-gold ring, paper gap, initials. */
export function RingAvatar({ initials, tone, size = 64, className }: { initials: string; tone: Tone; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full bg-gradient-to-br from-clay to-gold p-[3px]", className)}>
      <span className="rounded-full bg-paper p-[3px]">
        <span className={cn("flex items-center justify-center rounded-full font-display font-bold", TONE[tone].bg, TONE[tone].ink)} style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>
      </span>
    </span>
  );
}

/** White card listing links with pastel icon tiles and chevrons (HP2, HP6). */
export function LinkRows({ rows, className }: { rows: { href: string; icon: IconName; tone: Tone; title: string; sub: string; subPhone?: string }[]; className?: string }) {
  return (
    <div className={cn("dc-card px-5 py-0.5", className)}>
      {rows.map((r, i) => (
        <Link key={r.href} href={r.href} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
          <IconTile icon={r.icon} tone={r.tone} iconSize={23} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-bold">{r.title}</span>
            <span className="mt-0.5 block text-[13.5px] text-stone">{r.subPhone ? <><span className="lg:hidden">{r.subPhone}</span><span className="max-lg:hidden">{r.sub}</span></> : r.sub}</span>
          </span>
          <Icon name="chevronRight" size={18} className="text-stone" />
        </Link>
      ))}
    </div>
  );
}

/** Rows without links, for status facts (HP7). */
export function InfoRows({ rows, className }: { rows: { icon: IconName; tone: Tone; title: string; sub: string }[]; className?: string }) {
  return (
    <div className={cn("dc-card px-5 py-0.5", className)}>
      {rows.map((r, i) => (
        <div key={r.title} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
          <IconTile icon={r.icon} tone={r.tone} iconSize={23} />
          <div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{r.title}</p><p className="mt-0.5 text-[13.5px] text-stone">{r.sub}</p></div>
        </div>
      ))}
    </div>
  );
}

/** Label / value rows from "What a guardian sees". */
export function FactRows({ rows, compact }: { rows: [string, string][]; compact?: boolean }) {
  return (
    <dl>
      {rows.map(([k, v]) => (
        <div key={k} className={cn("flex justify-between gap-3.5 border-t border-line", compact ? "py-[9px] text-[14px] lg:py-2.5 lg:text-[14.5px]" : "py-3 text-[14.5px]")}>
          <dt className="shrink-0 basis-[110px] text-stone">{k}</dt><dd className="text-right font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const SAMPLE_APPROVAL: [string, string][] = [
  ["Mentor", "Emergency physician, cleared for young people"],
  ["Proposed time", "Thursday 29 October, 6:00 pm WAT"],
  ["Length", "60 minutes"],
  ["Recording", "On, and you can ask for it any time"],
];

/**
 * Illustration of a guardian's approval request (HP10, Main). Not interactive: the buttons are drawn, not real,
 * and the whole card is labelled as an example.
 */
export function ApprovalSample({ header, compact, className }: { header: ReactNode; compact?: boolean; className?: string }) {
  const fake = "inline-flex items-center justify-center rounded-full border-2 px-[22px] text-btn font-bold";
  return (
    <figure aria-label="Example of what a guardian sees" className={cn("dc-card", className)}>
      {header}
      <p className={cn("mt-3 font-display font-extrabold leading-[1.12] tracking-[-.01em]", compact ? "text-[21px] lg:text-[23px]" : "text-[22px]")}>Amara wants to talk with Kwame M. about medicine</p>
      <div className={compact ? "mt-3 lg:mt-3.5" : "mt-3"}><FactRows rows={SAMPLE_APPROVAL} compact={compact} /></div>
      <div className={cn("flex flex-col gap-2 lg:flex-row lg:gap-2.5", compact ? "mt-3.5 lg:mt-4" : "mt-3.5")} aria-hidden="true">
        <span className={cn(fake, "border-forest bg-forest text-forest-ink", compact ? "h-[50px]" : "h-12")}>Approve mentor and time</span>
        <span className={cn(fake, "border-line text-ink", compact ? "h-[50px]" : "h-12")}>Not now</span>
      </div>
    </figure>
  );
}

/** Vertical progress list from HP9 ("What happens after you apply"). */
export function StepTrail({ steps }: { steps: { title: string; sub: string; state: "done" | "current" | "next" }[] }) {
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={s.title} className={cn("relative flex gap-3.5", i < steps.length - 1 && "pb-4")}>
          {i < steps.length - 1 && <span className="absolute -bottom-3 left-[13px] top-[30px] w-0.5 bg-line" aria-hidden="true" />}
          {s.state === "done" && <CheckDot />}
          {s.state === "current" && <span className="size-7 shrink-0 rounded-full bg-clay shadow-[0_0_0_5px_rgb(var(--clay)/.2)]" />}
          {s.state === "next" && <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-line" />}
          <div className="mt-0.5 min-w-0 flex-1">
            <p className={cn("text-[16px]", s.state === "current" ? "font-extrabold" : "font-bold", s.state === "next" ? "text-stone" : "text-ink")}>{s.title}</p>
            <p className="text-[13.5px] text-stone">{s.sub}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Small stat block with a faint corner icon (HP1, Main numbers). */
export function StatCard({ value, label, icon, tone, badge, className }: { value: string; label: string; icon?: IconName; tone: Tone; badge?: string; className?: string }) {
  return (
    <div className={cn("relative min-w-0 rounded-card p-3.5 lg:px-5 lg:py-[18px]", TONE[tone].bg, TONE[tone].ink, className)}>
      {icon && <span className="absolute right-4 top-4 opacity-55"><Icon name={icon} size={22} /></span>}
      <p className="font-display text-[34px] font-extrabold leading-none lg:text-[44px]">{value}</p>
      <p className="mt-1.5 text-[14px]">{label}</p>
      {badge && <p className="mt-2.5"><Pill tone="outline" className="text-[11.5px] text-ink">{badge}</Pill></p>}
    </div>
  );
}

/** The closing pastel call to action band. Stacks on the phone. */
export function CtaBand({ tone, title, sub, children, className }: { tone: Tone; title: ReactNode; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-panel p-6 lg:flex-row lg:items-center lg:gap-[30px] lg:rounded-[36px] lg:px-11 lg:py-10", TONE[tone].bg, TONE[tone].ink, className)}>
      <div className="min-w-0 flex-1">
        <H className="text-[26px] lg:text-[38px] lg:[text-wrap:balance]">{title}</H>
        {sub && <p className="mt-3 text-[16.5px] leading-relaxed opacity-90 max-lg:hidden">{sub}</p>}
      </div>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:gap-[30px]">{children}</div>
    </section>
  );
}

/** Page heading: eyebrow or tag, title, sub. Sizes are [phone, desktop] px. */
export function Hero({ eyebrow, tag, title, sub, size = [40, 66], subSize = [16, 19], center, className, aside }: { eyebrow?: string; tag?: ReactNode; title: ReactNode; sub?: ReactNode; size?: [number, number]; subSize?: [number, number]; center?: boolean; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-10 pt-8 lg:flex-row lg:items-center lg:pt-14", center && "items-center text-center", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {tag}
        <h1 className={cn("mt-2.5 font-display font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-3 lg:max-w-[1060px] lg:leading-[1.02] lg:tracking-[-.025em]")}
          style={{ fontSize: `clamp(${size[0]}px, ${size[0]}px + (100vw - 390px) * ${(size[1] - size[0]) / 890}, ${size[1]}px)` }}>{title}</h1>
        {sub && <p className={cn("mt-4 leading-relaxed text-bark lg:mt-5 lg:max-w-[700px]", center && "mx-auto")} style={{ fontSize: `clamp(${subSize[0]}px, ${subSize[0]}px + (100vw - 390px) * ${(subSize[1] - subSize[0]) / 890}, ${subSize[1]}px)` }}>{sub}</p>}
      </div>
      {aside}
    </section>
  );
}

/** Sticky bottom action bar on phone boards (HP4, HP9, HP10). Hidden on desktop. */
export function PhoneActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-[92px] lg:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">{children}</div>
    </>
  );
}
