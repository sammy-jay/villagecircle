"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";
import { FAQ_AUDIENCES, filterFaq, type FAQ } from "@/lib/public-content";

/**
 * Accordion item from the boards. Variants:
 * - "butter": FAQ page, open item turns butter.
 * - "mint": landing FAQ, open item turns mint with a forest button.
 * - "section": policy sections, open item keeps white with a forest border and a "SECTION n" label.
 */
export function AccordionItem({ title, children, open, onToggle, variant = "butter", label }: { title: ReactNode; children: ReactNode; open: boolean; onToggle: () => void; variant?: "butter" | "mint" | "section"; label?: string }) {
  const id = useId();
  const box = {
    butter: open ? "bg-butter text-butter-ink border-butter py-5" : "bg-card border-line py-[18px]",
    mint: open ? "bg-mint border-line" : "bg-card border-line",
    section: open ? "border-2 border-forest bg-card py-5" : "bg-card border-line py-[18px]",
  }[variant];
  const btn = {
    butter: open ? "bg-card text-butter-ink" : "bg-sand text-ink",
    mint: open ? "bg-forest text-forest-ink" : "bg-sand text-ink",
    section: "text-ink",
  }[variant];
  const titleCls = {
    butter: "text-[17px] lg:text-[22px]" + (open ? " max-lg:text-[18px]" : ""),
    mint: cn("text-[17px] lg:text-[20px] leading-[1.2]", open ? "text-mint-ink" : "text-ink"),
    section: "text-[21px]",
  }[variant];
  return (
    <div className={cn("border", variant === "section" ? "rounded-[22px] px-[22px]" : "rounded-card", variant === "butter" && "px-[22px]", variant === "mint" && "px-4 py-3 lg:px-[26px] lg:py-[18px]", box)}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex min-h-[30px] w-full items-center gap-3.5 text-left">
          {label && <span className={cn("shrink-0 basis-[74px] text-caption font-extrabold tracking-[.04em] max-lg:hidden", open ? "text-forest" : "text-stone")}>{label}</span>}
          <span className={cn("flex-1 font-display font-extrabold leading-[1.12] tracking-[-.01em]", titleCls)}>{title}</span>
          <span className={cn("flex shrink-0 items-center justify-center rounded-full", variant === "section" ? "size-5" : "size-9", btn)}>
            <Icon name={open ? "minus" : "plus"} size={variant === "section" ? 20 : 18} strokeWidth={2.6} />
          </span>
        </button>
      </h3>
      <div id={id} hidden={!open} className={cn(
        variant === "butter" && "mt-2.5 pr-10 text-[15.5px] leading-[1.55]",
        variant === "mint" && "mt-2.5 max-w-[760px] text-[15.5px] leading-[1.55] text-bark",
        variant === "section" && "mt-3 text-[16px] leading-[1.65] text-bark",
      )}>{children}</div>
    </div>
  );
}

/** A list where one item is open at a time. */
export function Accordion({ items, variant, first = 0, gap = "gap-2.5 lg:gap-3" }: { items: { title: ReactNode; body: ReactNode; label?: string }[]; variant?: "butter" | "mint" | "section"; first?: number | null; gap?: string }) {
  const [open, setOpen] = useState<number | null>(first);
  return (
    <div className={cn("flex flex-col", gap)}>
      {items.map((it, i) => (
        <AccordionItem key={i} title={it.title} label={it.label} variant={variant} open={open === i} onToggle={() => setOpen(open === i ? null : i)}>{it.body}</AccordionItem>
      ))}
    </div>
  );
}

/** HP2: audience chips, search, and the answers. Chips sit above search on desktop and below it on the phone. */
export function FaqBrowser({ items, initialQ = "", topic }: { items: typeof FAQ; initialQ?: string; topic?: string }) {
  const [aud, setAud] = useState<string>("all");
  const [q, setQ] = useState(initialQ);
  const [t, setT] = useState(topic);
  const shown = filterFaq(items, { aud, q, topic: t });
  const chips = (phone: boolean) => (
    <div role="group" aria-label="Who is asking" className={cn("flex gap-2", phone ? "-mx-4 overflow-x-auto px-4 lg:hidden [scrollbar-width:none]" : "flex-wrap max-lg:hidden")}>
      {FAQ_AUDIENCES.map((a) => (
        <button key={a.id} type="button" aria-pressed={aud === a.id} onClick={() => setAud(a.id)}
          className={cn("dc-pill", aud === a.id ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>
          {phone && aud === a.id && <Icon name="check" size={16} />}{a.label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-4 lg:gap-3">
      {chips(false)}
      <label className="flex h-12 items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] text-[15px] text-stone focus-within:border-ink">
        <Icon name="search" size={19} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the questions" aria-label="Search the questions" className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
      </label>
      {chips(true)}
      {t && (
        <p className="flex items-center gap-2 text-[14px] text-bark">
          Showing one topic. <button type="button" onClick={() => setT(undefined)} className="font-bold text-clay underline-offset-2 hover:underline">Show all questions</button>
        </p>
      )}
      {shown.length ? (
        <Accordion key={`${aud}|${q}|${t ?? ""}`} items={shown.map((f) => ({ title: f.q, body: f.a }))} variant="butter" />
      ) : (
        <p className="dc-card p-6 text-[15.5px] text-bark">Nothing matches that yet. Try other words, or contact the team and a person will reply.</p>
      )}
    </div>
  );
}
