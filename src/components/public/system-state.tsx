import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";

/** HP8 shell: logo and "Need help?" only, so nothing else can fail while we are down. */
export function SystemShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-line lg:border-b lg:bg-card">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-2 px-4 lg:h-[76px] lg:justify-between lg:px-14">
          <Link href="/" className="flex flex-1 items-center gap-2.5 lg:flex-none" aria-label="The Village Circle, home">
            <Image src="/brand/mark.png" alt="" width={38} height={37} className="lg:hidden" />
            <span className="font-display text-[20px] font-extrabold tracking-[-.01em] lg:hidden">Village</span>
            <Image src="/brand/logo.png" alt="The Village Circle" width={56} height={50} className="max-lg:hidden" />
          </Link>
          <p className="text-[13.5px] text-stone lg:text-[15px]">Need help? <Link href="/help#contact" className="font-bold text-clay"><span className="lg:hidden">Contact us</span><span className="max-lg:hidden">Contact the team</span></Link></p>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[560px] px-4 pb-10 pt-2 lg:pt-14">{children}</main>
    </>
  );
}

/** One state card: tilted pastel tile, title, body, actions. */
export function StateCard({ tone, icon, struck, title, body, reference, children }: { tone: "butter" | "blush"; icon: "globe" | "alert"; struck?: boolean; title: string; body: string; reference?: string; children: ReactNode }) {
  return (
    <div className="dc-card p-5 lg:p-6">
      <div className="flex flex-col items-center px-1 py-3.5 text-center lg:px-5 lg:py-[26px]">
        <span className={cn("relative flex size-[92px] items-center justify-center rounded-[30px]", tone === "butter" ? "-rotate-[5deg] bg-butter text-butter-ink" : "rotate-[5deg] bg-blush text-blush-ink")} aria-hidden="true">
          <Icon name={icon} size={46} />
          {struck && <span className="absolute left-[18px] top-11 h-[5px] w-14 -rotate-45 rounded-[3px] border-t-2 border-butter bg-butter-ink" />}
        </span>
        <h1 className="mt-[22px] font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[32px]">{title}</h1>
        <p className="mt-2.5 max-w-[400px] text-[16.5px] leading-normal text-bark">{body}</p>
        {reference && <p className="mt-4 inline-block rounded-tile bg-blush px-3 py-2 text-[13px] font-bold text-blush-ink">Reference: {reference}</p>}
        <div className="mt-[22px] flex flex-col gap-2.5 self-stretch lg:flex-row lg:justify-center lg:self-auto">{children}</div>
      </div>
    </div>
  );
}
