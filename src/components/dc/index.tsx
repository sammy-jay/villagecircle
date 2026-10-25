import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { AskState } from "@prisma/client";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

export { Icon, type IconName } from "./icons";
export * from "./client";
export * from "./nav";
export * from "./nav-config";

/* ───────── §2 Type ───────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("dc-eyebrow", className)}>{children}</p>;
}

/** Page heading block used at the top of most screens: eyebrow, H1, supporting line, optional actions. */
export function PageHead({ eyebrow, title, sub, actions, size = "h1", className }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; size?: "h1" | "h2"; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-[760px]">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className={size === "h1" ? "dc-h1 max-sm:text-h2" : "dc-h2"}>{title}</h1>
        {sub && <p className="mt-3 text-body text-bark">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/* ───────── §3 Buttons ───────── */

type BtnVariant = "primary" | "forest" | "ghost" | "soft";
type BtnSize = "md" | "sm" | "lg";
type BtnOwn = { variant?: BtnVariant; size?: BtnSize; icon?: IconName; iconRight?: IconName; className?: string; children?: ReactNode };
const btnClass = (variant: BtnVariant, size: BtnSize, className?: string) =>
  cn("dc-btn", `dc-btn-${variant}`, size === "sm" && "dc-btn-sm", size === "lg" && "dc-btn-lg", className);

/** One clay (primary) button per view. Ghost and soft for everything else. Pass href to render a link. */
export function Button({ variant = "ghost", size = "md", icon, iconRight, className, children, ...rest }: BtnOwn & Omit<ComponentProps<"button">, keyof BtnOwn>) {
  return (
    <button type="button" className={btnClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  );
}

export function ButtonLink({ variant = "ghost", size = "md", icon, iconRight, className, children, ...rest }: BtnOwn & Omit<ComponentProps<typeof Link>, keyof BtnOwn>) {
  return (
    <Link className={btnClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </Link>
  );
}

/* ───────── §4 Pills, status tags and counts ───────── */

export type Tone = "mint" | "butter" | "blush" | "grey" | "outline";

/** Green, amber and rose tags carry meaning; grey is for plain state. */
export function Tag({ tone = "grey", icon, children, className }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn("dc-tag", `dc-tag-${tone}`, className)}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

export type AskTagKey = AskState | "PAUSED" | "NEEDS_INFO";

/** DSF "Ask status tags". States not drawn on the board reuse the nearest drawn tag. */
export const ASK_TAG: Record<AskTagKey, { label: string; tone: Tone; icon?: IconName }> = {
  DRAFT: { label: "Draft", tone: "grey" },
  AWAITING_GUARDIAN: { label: "Awaiting guardian", tone: "butter", icon: "clock" },
  SUBMITTED: { label: "In team review", tone: "grey", icon: "shield" },
  IN_TEAM_REVIEW: { label: "In team review", tone: "grey", icon: "shield" },
  OPEN_TO_MENTORS: { label: "With mentors", tone: "grey", icon: "users" },
  MENTOR_STEPPED_FORWARD: { label: "Stepped forward", tone: "mint", icon: "check" },
  CONNECTION_APPROVED: { label: "Stepped forward", tone: "mint", icon: "check" },
  SCHEDULED: { label: "Scheduled", tone: "mint", icon: "calendar" },
  HELD: { label: "Complete", tone: "mint", icon: "check" },
  COMPLETE: { label: "Complete", tone: "mint", icon: "check" },
  FOLLOW_UP_REQUESTED: { label: "Follow-up", tone: "butter", icon: "clock" },
  ONGOING_MENTORSHIP: { label: "Ongoing", tone: "mint", icon: "check" },
  WITHDRAWN: { label: "Withdrawn", tone: "grey" },
  ANSWERED_BY_RESOURCE: { label: "Answered", tone: "grey" },
  REDIRECTED: { label: "Redirected", tone: "grey" },
  NOT_PROCEEDING: { label: "Closed", tone: "grey" },
  GUARDIAN_DECLINED: { label: "Closed", tone: "grey" },
  LAPSED: { label: "Closed", tone: "grey" },
  PAUSED: { label: "Paused", tone: "blush", icon: "pause" },
  NEEDS_INFO: { label: "Needs info", tone: "blush", icon: "alert" },
};

export function AskTag({ state, className }: { state: AskTagKey; className?: string }) {
  const t = ASK_TAG[state];
  return <Tag tone={t.tone} icon={t.icon} className={className}>{t.label}</Tag>;
}

/** Clay count badge for nav items and tabs. */
export function Count({ n, label, className }: { n: number; label?: string; className?: string }) {
  if (n <= 0) return null;
  return <span className={cn("dc-count", className)} aria-label={label ?? `${n} new`}>{n > 99 ? "99+" : n}</span>;
}

/* ───────── §5 Inputs (static parts; interactive ones live in client.tsx) ───────── */

export function Field({ label, hint, error, htmlFor, children, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="dc-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="dc-error" role="alert">{error}</span> : hint ? <span className="dc-hint">{hint}</span> : null}
    </div>
  );
}

/** 58px field. Pass icon for a leading glyph (e.g. mail). */
export function Input({ icon, className, ...rest }: { icon?: IconName } & ComponentProps<"input">) {
  if (!icon) return <input className={cn("dc-input", className)} {...rest} />;
  return (
    <div className="relative">
      <Icon name={icon} size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink" />
      <input className={cn("dc-input pl-[45px]", className)} {...rest} />
    </div>
  );
}

export function SearchInput({ className, ...rest }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" size={19} className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-stone" />
      <input type="search" className="dc-search" {...rest} />
    </div>
  );
}

/* ───────── §6 Cards ───────── */

export function Card({ as: As = "div", className, children, ...rest }: { as?: "div" | "section" | "article" | "li" } & ComponentProps<"div">) {
  return <As className={cn("dc-card", className)} {...(rest as object)}>{children}</As>;
}

/** Pastel block for big moments ("Dr Bisi stepped forward for your Ask"). */
export function Moment({ tone = "butter", tag, title, sub, progress, children, className }: { tone?: "butter" | "mint" | "blush"; tag?: ReactNode; title: ReactNode; sub?: ReactNode; progress?: number; children?: ReactNode; className?: string }) {
  return (
    <section className={cn("dc-moment", `dc-moment-${tone}`, className)}>
      {tag && <span className="mb-2 inline-flex h-[30px] items-center rounded-full border border-line px-[13px] text-eyebrow font-semibold tracking-normal">{tag}</span>}
      <h2 className="font-display text-moment font-extrabold">{title}</h2>
      {sub && <p className="mt-1 text-support">{sub}</p>}
      {progress !== undefined && <Progress value={progress} className="mt-3" barClassName="bg-current" />}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

export function Progress({ value, className, barClassName, label }: { value: number; className?: string; barClassName?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={cn("dc-progress", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className={cn("h-full rounded-lg bg-forest", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────── §7 Avatars and story rings ───────── */

const AVATAR_TONES = ["bg-blush text-blush-ink", "bg-mint text-mint-ink", "bg-butter text-butter-ink", "bg-sand text-ink"] as const;
const toneFor = (seed: string) => AVATAR_TONES[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export const initials = (name: string) =>
  name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

const AV_SIZE = { xs: "size-8 text-[12px]", sm: "size-[34px] text-[12px]", md: "size-10 text-[14px]", lg: "size-11 text-[16px]", xl: "size-[62px] text-[22px]" } as const;

/** Initials avatar. Tone is stable per name unless given. */
export function Avatar({ name, size = "md", tone, className }: { name: string; size?: keyof typeof AV_SIZE; tone?: "blush" | "mint" | "butter" | "sand"; className?: string }) {
  const t = tone ? { blush: AVATAR_TONES[0], mint: AVATAR_TONES[1], butter: AVATAR_TONES[2], sand: AVATAR_TONES[3] }[tone] : toneFor(name);
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-extrabold", AV_SIZE[size], t, className)} aria-hidden="true">{initials(name)}</span>;
}

/** D1 story ring: 3px clay-to-gold ring, 3px paper gap, 58px avatar, caption under. `ring="none"` keeps the spacing without the ring. */
export function StoryRing({ name, caption, ring = "gold", href, tone }: { name: string; caption: string; ring?: "gold" | "clay" | "none"; href?: string; tone?: "blush" | "mint" | "butter" }) {
  const t = tone ? { blush: AVATAR_TONES[0], mint: AVATAR_TONES[1], butter: AVATAR_TONES[2] }[tone] : toneFor(name);
  const face = <span className={cn("flex size-[58px] items-center justify-center rounded-full font-display text-[21px] font-bold", t)}>{initials(name)}</span>;
  const body = (
    <>
      {ring === "none" ? <span className="p-1.5">{face}</span> : (
        <span className="rounded-full bg-[linear-gradient(135deg,rgb(var(--clay)),#C99A2E)] p-[3px]"><span className="block rounded-full bg-paper p-[3px]">{face}</span></span>
      )}
      <span className="max-w-[72px] truncate text-[12px] font-semibold text-bark">{caption}</span>
    </>
  );
  const cls = "flex w-[72px] shrink-0 flex-col items-center gap-[5px]";
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Overlapping 40px avatars with a "+N in the village" caption. */
export function AvatarStack({ names, more, caption }: { names: string[]; more?: number; caption?: string }) {
  return (
    <div className="flex items-center">
      <div className="flex">
        {names.map((n, i) => <Avatar key={n + i} name={n} size="md" className={cn("ring-2 ring-card", i > 0 && "-ml-2.5")} />)}
      </div>
      {(caption || more) && <span className="ml-2.5 text-caption text-stone">{caption ?? `+${more} in the village`}</span>}
    </div>
  );
}

/* ───────── §8 Banners and timeline ───────── */

const BANNER = {
  mint: { cls: "bg-mint text-mint-ink", icon: "shieldCheck" },
  butter: { cls: "bg-butter text-butter-ink", icon: "clock" },
  blush: { cls: "bg-blush text-blush-ink", icon: "alert" },
} as const satisfies Record<string, { cls: string; icon: IconName }>;

export function Banner({ tone = "mint", icon, children, action, className }: { tone?: keyof typeof BANNER; icon?: IconName; children: ReactNode; action?: ReactNode; className?: string }) {
  const b = BANNER[tone];
  return (
    <div className={cn("dc-banner", b.cls, className)} role={tone === "blush" ? "alert" : "status"}>
      <Icon name={icon ?? b.icon} size={24} />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export type TimelineStep = { title: ReactNode; meta?: ReactNode; state: "done" | "current" | "next" };

/** Vertical step list: done = forest check, current = butter, next = outline. 2px connector. */
export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-3.5 pb-[25px] last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[13px] top-[30px] h-[calc(100%-32px)] w-0.5 rounded-full bg-line" aria-hidden="true" />}
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full",
            s.state === "done" && "bg-forest text-forest-ink",
            s.state === "current" && "bg-butter text-butter-ink",
            s.state === "next" && "border-2 border-line bg-card")}>
            {s.state === "done" && <Icon name="check" size={16} />}
            {s.state === "current" && <span className="size-2 rounded-full bg-current" />}
          </span>
          <div className="pt-0.5">
            <p className={cn("text-[15px] font-bold leading-[18px]", s.state === "next" && "text-stone")}>{s.title}</p>
            {s.meta && <p className="text-caption text-stone">{s.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ───────── §10 Empty states ───────── */

export function EmptyState({ icon = "message", title, children, action, className }: { icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="flex size-[91px] items-center justify-center rounded-full bg-butter text-butter-ink"><Icon name={icon} size={43} strokeWidth={1.6} /></span>
      <h2 className="font-display text-[22px] font-extrabold leading-[1.2]">{title}</h2>
      {children && <p className="mt-3 max-w-[350px] text-support text-bark">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
