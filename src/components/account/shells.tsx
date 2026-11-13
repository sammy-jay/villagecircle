import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/dc/icons";

/*
 * Frames for the sign-up and account boards (M and DK series).
 * Desktop: either a split page (form column + pastel art panel) or a white top bar with centred content.
 * Phone: a 60px header (back button or mark, title, right slot), content, and an optional sticky action bar.
 */

export type Pastel = "butter" | "mint" | "blush";
const PANEL: Record<Pastel | "sand", string> = { butter: "bg-butter", mint: "bg-mint", blush: "bg-blush", sand: "bg-[#F2E8DA]" };

export function PhoneHeader({ back, title, right, mark, home = "/" }: { back?: string; title?: ReactNode; right?: ReactNode; mark?: boolean; home?: string }) {
  return (
    <div className="flex h-[60px] items-center gap-2 px-4 lg:hidden">
      {back ? (
        <Link href={back} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink"><Icon name="chevronLeft" size={20} /></Link>
      ) : mark !== false ? (
        <Link href={home} aria-label="The Village Circle, home"><Image src="/brand/mark.png" alt="" width={38} height={37} /></Link>
      ) : null}
      <p className="ml-2.5 min-w-0 flex-1 truncate font-display text-[20px] font-extrabold tracking-[-.01em]">{title}</p>
      {right}
    </div>
  );
}

/** Sticky bottom bar on phone boards. Render after the main content. */
export function PhoneBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <div className="h-[104px] lg:hidden" aria-hidden="true" />
      <div className={cn("fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden", className)}>{children}</div>
    </>
  );
}

/**
 * DK1, DK3, DK4, M19 to M22, P02: form column on the left (700 or 640 wide, 44/80 padding, logo on top),
 * pastel panel on the right with illustration cards. `center` vertically centres the column body.
 */
export function SplitShell({ width = 640, panel, art, children, center, phone }: { width?: 640 | 700 | "half"; panel: Pastel | "sand"; art: ReactNode; children: ReactNode; center?: boolean; phone?: { back?: string; title?: ReactNode; right?: ReactNode; mark?: boolean } }) {
  const half = width === "half"; // form and art panel take 50% each; the form column stays readable at 560px
  return (
    <div className="min-h-screen lg:flex">
      <PhoneHeader {...phone} />
      <div className={cn("flex flex-col gap-4 px-6 pb-[18px] pt-2 lg:flex-none lg:py-11", half ? "lg:w-1/2 lg:items-center lg:px-12" : width === 700 ? "lg:w-[700px] lg:px-20" : "lg:w-[640px] lg:px-20")}>
        <Link href="/" className={cn("self-start max-lg:hidden", half && "lg:w-full lg:max-w-[560px]")} aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={62} height={56} priority /></Link>
        <main id="main" className={cn("flex flex-col gap-4", half && "lg:w-full lg:max-w-[560px]", center && "lg:flex-1 lg:justify-center lg:pb-10")}>{children}</main>
      </div>
      <aside aria-hidden="true" className={cn("hidden flex-1 items-center justify-center overflow-hidden p-10 lg:flex", PANEL[panel])}>{art}</aside>
    </div>
  );
}

/** DK2, DK6, M11-D, M12-D, M18, M25, DK5: white top bar (logo + right slot) above centred content. */
export function BarShell({ right, children, max = 1100, phone, className }: { right?: ReactNode; children: ReactNode; max?: number; phone?: { back?: string; title?: ReactNode; right?: ReactNode; mark?: boolean }; className?: string }) {
  return (
    <div className="min-h-screen">
      <header className="hidden h-[76px] items-center justify-between border-b border-line bg-card px-14 lg:flex">
        <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={56} height={50} priority /></Link>
        <div className="flex items-center gap-[18px] text-[14.5px] text-stone">{right}</div>
      </header>
      <PhoneHeader {...phone} />
      <main id="main" className={cn("mx-auto w-full px-4 pb-[18px] pt-1 lg:px-0 lg:pb-14 lg:pt-11", className)} style={{ maxWidth: max }}>{children}</main>
    </div>
  );
}

export const HelpLink = ({ short }: { short?: boolean }) => (
  <span>Need help? <Link href="/help#contact" className="font-bold text-clay">{short ? "Contact us" : "Contact the team"}</Link></span>
);

/** Rotated pastel icon tile used at the top of state screens. */
export function TiltTile({ icon, tone, size = 84, rotate = -6, white, className }: { icon: IconName; tone: Pastel; size?: number; rotate?: number; white?: boolean; className?: string }) {
  const t = { butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink" }[tone];
  const ink = { butter: "text-butter-ink", mint: "text-mint-ink", blush: "text-blush-ink" }[tone];
  return (
    <span className={cn("flex shrink-0 items-center justify-center", white ? cn("bg-card", ink) : t, className)} style={{ width: size, height: size, borderRadius: Math.round(size / 3), transform: `rotate(${rotate}deg)` }}>
      <Icon name={icon} size={Math.round(size / 2)} />
    </span>
  );
}

/** Tilted white card for art panels. */
export function ArtCard({ rotate = 0, className, children }: { rotate?: number; className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card bg-card p-[18px] shadow-[0_14px_30px_rgba(40,30,10,.10)]", className)} style={{ transform: `rotate(${rotate}deg)` }}>{children}</div>;
}

/** Numbered step card used in "What happens next" panels (DK4, M18). */
export function NextStep({ n, tone, title, body, rotate }: { n: number; tone: Pastel; title: string; body: string; rotate: number }) {
  const t = { butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink" }[tone];
  return (
    <ArtCard rotate={rotate}>
      <div className="flex items-start gap-3.5">
        <span className={cn("flex size-[34px] shrink-0 items-center justify-center rounded-tile font-display text-[17px] font-extrabold", t)}>{n}</span>
        <div><p className="text-[16px] font-extrabold">{title}</p><p className="mt-0.5 text-[14px] leading-[1.4] text-bark">{body}</p></div>
      </div>
    </ArtCard>
  );
}

/** The 3-step progress bars at the top of M12 and M20. */
export function StepBars({ steps, current }: { steps: ReactNode[]; current: number }) {
  return (
    <ol className="flex gap-2.5">
      {steps.map((s, i) => (
        <li key={i} className="flex flex-1 flex-col gap-[7px]" aria-current={i === current ? "step" : undefined}>
          <span className={cn("h-2 rounded", i <= current ? "bg-forest" : "bg-sand")} />
          <span className={cn("text-[13px]", i === current ? "font-extrabold text-ink" : "font-semibold text-stone")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
