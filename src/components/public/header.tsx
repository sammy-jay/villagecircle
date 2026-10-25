"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";

/** One set of links on every public page, so the bar never changes as people move around the site. */
const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/become-a-mentor", label: "For mentors" },
  { href: "/families", label: "For families" },
  { href: "/library", label: "Library" },
  { href: "/faq", label: "FAQ" },
];
const MENU_EXTRA = [
  { href: "/about", label: "About us" },
  { href: "/families", label: "For families" },
  { href: "/help", label: "Help centre" },
  { href: "/#events", label: "Events" },
  { href: "/help/report", label: "Report a concern" },
];

/** Public header, the same on every public page: sticky, six links, Log in and Join free. */
export function PublicHeader() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const nav = NAV;
  const active = (href: string) => !href.includes("#") && (path === href || path.startsWith(href + "/"));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/[.97]">
      {/* Desktop */}
      <div className="mx-auto hidden h-[76px] max-w-[1280px] items-center gap-[30px] px-14 lg:flex">
        <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={56} height={50} priority /></Link>
        <nav aria-label="Main" className="flex flex-1 gap-[26px]">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("text-[15.5px] hover:text-clay", active(n.href) ? "font-extrabold" : "font-semibold")}>{n.label}</Link>
          ))}
        </nav>
        <div className="flex gap-2.5">
          <Link href="/login" className="dc-btn dc-btn-soft h-11">Log in</Link>
          <Link href="/register" className="dc-btn dc-btn-primary h-11">Join free</Link>
        </div>
      </div>

      {/* Phone */}
      <div className="flex h-16 items-center gap-2 px-4 lg:hidden">
        <Link href="/" aria-label="The Village Circle, home" className="flex min-w-0 flex-1 items-center gap-3">
          <Image src="/brand/mark.png" alt="" width={38} height={37} priority />
          <span className="truncate font-display text-[19px] font-extrabold tracking-[-.01em]">Village Circle</span>
        </Link>
        <Link href="/register" className="dc-btn dc-btn-primary h-[42px] px-[18px]">Join free</Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
          className="flex size-11 items-center justify-center rounded-full bg-sand text-ink">
          <Icon name="menu" size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 rounded-b-panel bg-card px-4 pb-6 pt-3 shadow-toast">
            <div className="flex h-12 items-center justify-between">
              <span className="font-display text-[20px] font-extrabold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-10 items-center justify-center rounded-full bg-sand"><Icon name="x" size={20} /></button>
            </div>
            <nav aria-label="Main" className="mt-2 flex flex-col text-[16px] font-semibold">
              {[...nav, ...MENU_EXTRA.filter((x) => !nav.some((n) => n.href === x.href))].map((n) => (
                <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-12 items-center border-t border-line", active(n.href) && "font-extrabold text-clay")}>{n.label}</Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/register" className="dc-btn dc-btn-primary h-[54px] w-full">Join free</Link>
              <Link href="/login" className="dc-btn dc-btn-soft h-[50px] w-full">Log in</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
