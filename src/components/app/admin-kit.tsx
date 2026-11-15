import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";
import { APP_TZ } from "@/lib/domain/scheduling";

/* Pieces shared by the team console boards (A-series). Server components only. */

export type Tone = "butter" | "mint" | "blush" | "sand" | "ink" | "forest" | "clay" | "outline";
const TONE: Record<Tone, string> = {
  butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink", sand: "bg-sand text-ink",
  ink: "bg-ink text-paper", forest: "bg-forest text-forest-ink", clay: "bg-clay text-clay-ink", outline: "border border-line bg-card text-ink",
};
export const toneClass = (t: Tone) => TONE[t];

/** `wrap`: long text runs onto more lines (rounded corners instead of a full pill, icon on the first line). */
export function Pill({ tone = "sand", icon, children, className, wrap }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string; wrap?: boolean }) {
  return (
    <span className={cn("inline-flex gap-1.5 px-[11px] py-1.5 text-[12.5px] font-semibold", wrap ? "items-start rounded-[14px] leading-snug" : "items-center whitespace-nowrap rounded-full", TONE[tone], className)}>
      {icon && <Icon name={icon} size={14} className={wrap ? "mt-[2px] shrink-0" : undefined} />}{children}
    </span>
  );
}

/** A3 stat tiles: big number, label, one line under it. */
export function StatTile({ n, label, sub, tone, icon, href }: { n: ReactNode; label: string; sub?: string; tone: Tone; icon?: IconName; href?: string }) {
  const body = (
    <div className={cn("relative flex h-full min-w-0 flex-col rounded-[24px] p-4 lg:p-5", TONE[tone])}>
      {icon && <Icon name={icon} size={20} className="absolute right-4 top-4 opacity-70" />}
      <span className="font-display text-[34px] font-extrabold leading-none lg:text-[44px]">{n}</span>
      <span className="mt-2 text-[14px] font-semibold lg:text-[15px]">{label}</span>
      {sub && <span className="mt-0.5 text-[12.5px] font-bold opacity-90">{sub}</span>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

/** Percentage ring (queue health, shortlist fit). */
export function Ring({ pct, size = 64, label, track = "#E4DFD5", color = "#4A7E62", children }: { pct: number; size?: number; label?: string; track?: string; color?: string; children?: ReactNode }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <span role="img" aria-label={label ?? `${p}%`} className="relative inline-flex shrink-0 rounded-full" style={{ width: size, height: size, background: `conic-gradient(${color} ${p * 3.6}deg, ${track} 0)` }}>
      <span className="absolute flex items-center justify-center rounded-full bg-card text-center font-display font-extrabold leading-none" style={{ inset: Math.max(6, size * 0.11), fontSize: Math.max(13, size * 0.24) }}>{children ?? `${p}%`}</span>
    </span>
  );
}

/** Filter pills that are links, so the filter is in the address. */
export function FilterPills({ items, label = "Filter" }: { items: { href: string; label: string; n?: number; on: boolean }[]; label?: string }) {
  return (
    <ScrollX as="nav" variant="chips" bleed={5} label="filters" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
      {items.map((i) => <Link key={i.href} href={i.href} aria-current={i.on ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-bold", i.on ? "bg-forest text-forest-ink" : "bg-sand")}>{i.label}{i.n != null ? ` ${i.n}` : ""}</Link>)}
    </ScrollX>
  );
}

/** Table on a white card with a sand header row; scrolls sideways on the phone. */
export function Table({ head, children, minWidth = 720, caption }: { head: ReactNode[]; children: ReactNode; minWidth?: number; caption?: string }) {
  return (
    <ScrollX variant="table" label="columns" className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full text-left text-[14.5px]" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-sand"><tr>{head.map((h, i) => <th key={i} scope="col" className="px-5 py-3.5 text-[12px] font-extrabold uppercase tracking-[.06em] text-bark">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </ScrollX>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-5 py-3.5 align-middle", className)}>{children}</td>;

export const Panel = ({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" }) => <As className={cn("rounded-card border border-line bg-card p-5 lg:p-6", className)}>{children}</As>;
export const PanelHead = ({ title, href, link, right }: { title: string; href?: string; link?: string; right?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[23px]">{title}</h2>{href ? <Link href={href} className="text-[14px] font-bold text-clay">{link ?? "See all"} ›</Link> : right}</div>
);

/** Two-column key/value rows (record pages, configuration). */
export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return <dl className="divide-y divide-line">{rows.map(([k, v], i) => <div key={i} className="flex justify-between gap-4 py-2.5 text-[14.5px]"><dt className="text-bark">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}</dl>;
}

/** Coloured banner with an icon (at-risk notes, rules of the page). */
export function Note({ tone = "butter", icon = "info", children, className }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return <p className={cn("flex items-start gap-3 rounded-[22px] px-[18px] py-4 text-[14.5px] leading-normal", TONE[tone], className)}><Icon name={icon} size={20} className="mt-px shrink-0" /><span>{children}</span></p>;
}

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="rounded-card border border-dashed border-line bg-card px-6 py-10 text-center"><p className="font-display text-[20px] font-extrabold">{title}</p>{children && <p className="mx-auto mt-1.5 max-w-[460px] text-[14.5px] text-bark">{children}</p>}</div>
);

/** Initials circle for people in admin lists. Names are allowed inside the console. */
export function Person({ name, sub, tone = "butter", size = 44 }: { name: string; sub?: ReactNode; tone?: "butter" | "mint" | "blush"; size?: number }) {
  const ini = name.replace(/^Dr\.? /, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-bold", TONE[tone])} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">{ini}</span>
      <span className="min-w-0"><b className="block truncate text-[15px]">{name}</b>{sub && <span className="block text-[12.5px] text-stone">{sub}</span>}</span>
    </span>
  );
}

export const day = (d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => (d ? new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...opts }).format(new Date(d)) : "");
