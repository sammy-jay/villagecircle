import type { ReactNode } from "react";
import { Icon } from "@/components/dc/icons";
import { parseRich, type Block, type Inline } from "@/lib/domain/rich-text";
import { cn } from "@/lib/cn";

/**
 * A formatted resource body (see lib/domain/rich-text.ts), the same on every page that shows one: the library,
 * the public page, the moderation screen and the editor's preview. Built from parsed blocks only, never from HTML.
 * `## ` headings get anchors s0, s1… for "In this article".
 */
export function RichText({ body, className, size = "md" }: { body: string | null | undefined; className?: string; size?: "md" | "sm" }) {
  const blocks = parseRich(body);
  let h = 0;
  const text = size === "sm" ? "text-[15px] leading-[1.6]" : "text-[16px] leading-[1.65]";
  return (
    <div className={cn("flex flex-col gap-3.5 text-ink", text, className)}>
      {blocks.map((b, i) => <BlockView key={i} b={b} id={b.t === "h2" ? `s${h++}` : undefined} first={i === 0} size={size} />)}
    </div>
  );
}

function BlockView({ b, id, first, size }: { b: Block; id?: string; first: boolean; size: "md" | "sm" }) {
  switch (b.t) {
    case "h2": return <h2 id={id} className={cn("scroll-mt-24 font-display font-extrabold leading-[1.15] tracking-[-.01em]", size === "sm" ? "text-[18px]" : "text-[21px]", !first && "mt-3")}>{inl(b.c)}</h2>;
    case "h3": return <h3 className={cn("font-bold leading-snug", size === "sm" ? "text-[15.5px]" : "text-[17px]", !first && "mt-1")}>{inl(b.c)}</h3>;
    case "p": return <p>{lines(b.lines)}</p>;
    case "ul": return <ul className="flex list-disc flex-col gap-1.5 pl-6 marker:text-stone">{b.items.map((c, i) => <li key={i} className="pl-1">{inl(c)}</li>)}</ul>;
    case "ol": return <ol start={b.start} className="flex list-decimal flex-col gap-1.5 pl-6 marker:font-bold marker:text-bark">{b.items.map((c, i) => <li key={i} className="pl-1">{inl(c)}</li>)}</ol>;
    case "check": return (
      <ul className="flex flex-col gap-2">
        {b.items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span aria-hidden="true" className={cn("mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2", it.done ? "border-forest bg-forest text-forest-ink" : "border-line bg-card")}>{it.done && <Icon name="check" size={13} strokeWidth={3} />}</span>
            <span><span className="sr-only">{it.done ? "Done: " : "To do: "}</span>{inl(it.c)}</span>
          </li>
        ))}
      </ul>
    );
    case "tip": return (
      <aside className="flex gap-3 rounded-[18px] bg-butter px-4 py-3.5 text-butter-ink">
        <Icon name="sparkle" size={20} className="mt-0.5 shrink-0" />
        <p><span className="sr-only">Tip: </span>{lines(b.lines)}</p>
      </aside>
    );
  }
}

const lines = (ls: Inline[][]) => ls.map((l, i) => <span key={i}>{i > 0 && <br />}{inl(l)}</span>);

function inl(c: Inline[]): ReactNode {
  return c.map((n, i) => {
    if (n.t === "text") return <span key={i}>{n.v}</span>;
    if (n.t === "bold") return <strong key={i} className="font-bold">{inl(n.c)}</strong>;
    if (n.t === "italic") return <em key={i}>{inl(n.c)}</em>;
    return (
      <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-semibold text-clay underline decoration-clay/40 underline-offset-2 hover:decoration-clay">
        {inl(n.c)}<span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  });
}
