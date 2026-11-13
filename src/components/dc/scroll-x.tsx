"use client";

import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { Icon } from "./icons";
import { cn } from "@/lib/cn";

/**
 * A row that scrolls sideways, with a visible hint that there is more:
 * - "cards": dots and back / next arrows under the row (landing rails, mentor rails).
 * - "chips": a soft fade and a next arrow on the edge (filter pills, tabs).
 * - "table": a "Swipe to see more" line under a wide table.
 * Every hint shows only while the row actually overflows, so desktop grids and short rows stay clean.
 */
type Variant = "cards" | "chips" | "table";
type Bleed = 0 | 4 | 5;
const RIGHT: Record<Bleed, string> = { 0: "right-0", 4: "-right-4 lg:right-0", 5: "-right-5 lg:right-0" };
const LEFT: Record<Bleed, string> = { 0: "left-0", 4: "-left-4 lg:left-0", 5: "-left-5 lg:left-0" };

export function ScrollX({ children, variant = "cards", className, wrapClassName, controlsClassName, as = "div", bleed = 0, fade = "from-paper", label = "items", ...rest }: {
  children: ReactNode; variant?: Variant; className?: string; wrapClassName?: string; controlsClassName?: string;
  as?: "div" | "nav"; bleed?: Bleed; fade?: string; label?: string;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  const ref = useRef<HTMLElement | null>(null);
  const [s, setS] = useState({ over: false, start: true, end: true, count: 0, at: 0 });

  const measure = useCallback(() => {
    const el = ref.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const kids = Array.from(el.children) as HTMLElement[];
    const step = kids.length > 1 ? kids[1]!.offsetLeft - kids[0]!.offsetLeft : el.clientWidth;
    const end = el.scrollLeft >= max - 4;
    const at = end ? kids.length - 1 : Math.max(0, Math.round(el.scrollLeft / Math.max(step, 1)));
    setS({ over: max > 4, start: el.scrollLeft <= 4, end, count: kids.length, at });
  }, []);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => { el.removeEventListener("scroll", measure); ro.disconnect(); };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = ref.current; if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const step = variant === "cards" && kids.length > 1 ? kids[1]!.offsetLeft - kids[0]!.offsetLeft : el.clientWidth * 0.7;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: smooth ? "smooth" : "auto" });
  };
  const toItem = (i: number) => {
    const el = ref.current; const kid = el?.children[i] as HTMLElement | undefined; if (!el || !kid) return;
    const first = el.children[0] as HTMLElement;
    el.scrollTo({ left: kid.offsetLeft - first.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const Tag = as;
  const row = <Tag ref={ref as never} className={className} {...rest}>{children}</Tag>;
  const arrow = "flex size-10 items-center justify-center rounded-full border-2 border-line bg-card text-ink transition-opacity disabled:opacity-35";

  if (variant === "chips") return (
    <div className={cn("relative", wrapClassName)}>
      {row}
      {s.over && !s.start && (
        <div className={cn("pointer-events-none absolute inset-y-0 flex w-14 items-center bg-gradient-to-r to-transparent pl-1", LEFT[bleed], fade)}>
          <button type="button" onClick={() => go(-1)} aria-label={`Show earlier ${label}`} className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-card text-ink shadow-[0_2px_8px_rgba(40,30,10,.18)]"><Icon name="chevronLeft" size={16} /></button>
        </div>
      )}
      {s.over && !s.end && (
        <div className={cn("pointer-events-none absolute inset-y-0 flex w-14 items-center justify-end bg-gradient-to-l to-transparent pr-1", RIGHT[bleed], fade)}>
          <button type="button" onClick={() => go(1)} aria-label={`Show more ${label}`} className="pointer-events-auto flex size-8 items-center justify-center rounded-full bg-card text-ink shadow-[0_2px_8px_rgba(40,30,10,.18)]"><Icon name="chevronRight" size={16} /></button>
        </div>
      )}
    </div>
  );

  if (variant === "table") return (
    <div className={wrapClassName}>
      {row}
      {s.over && (
        <p className={cn("mt-2 flex items-center justify-end gap-1.5 text-[12.5px] font-semibold text-stone", controlsClassName)} aria-hidden="true">
          {s.end ? "You have seen it all" : <>Swipe to see more<Icon name="arrowRight" size={14} /></>}
        </p>
      )}
    </div>
  );

  return (
    <div className={wrapClassName}>
      {row}
      {s.over && (
        <div className={cn("mt-4 flex items-center justify-between gap-4", controlsClassName)}>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: s.count }, (_, i) => (
              <button key={i} type="button" onClick={() => toItem(i)} aria-label={`Go to ${i + 1} of ${s.count}`} aria-current={i === s.at ? "true" : undefined}
                className={cn("h-2 rounded-full transition-all", i === s.at ? "w-6 bg-ink" : "w-2 bg-line")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(-1)} disabled={s.start} aria-label={`Previous ${label}`} className={arrow}><Icon name="chevronLeft" size={18} /></button>
            <button type="button" onClick={() => go(1)} disabled={s.end} aria-label={`Next ${label}`} className={cn(arrow, !s.end && "border-ink bg-ink text-paper")}><Icon name="chevronRight" size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
