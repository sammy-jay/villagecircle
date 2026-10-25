"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";

const SITE_NAV = [
  { href: "/become-a-mentor", label: "Mentors" },
  { href: "/library", label: "Library" },
  { href: "/#events", label: "Events" },
  { href: "/faq", label: "FAQ" },
];
const HOME_NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/become-a-mentor", label: "For mentors" },
  { href: "/families", label: "For families" },
  { href: "/faq", label: "FAQ" },
  { href: "/help", label: "Help" },
];
const MENU_EXTRA = [
  { href: "/about", label: "About us" },
  { href: "/families", label: "For families" },
  { href: "/help", label: "Help centre" },
  { href: "/help/report", label: "Report a concern" },
];

/**
 * Public header. `home` is the landing variant: sticky, translucent, six links and a forest "Join the Village".
 * `phoneJoin` shows the clay Join free pill on the phone bar (some boards leave it out).
 */
export function PublicHeader({ home, phoneJoin = true }: { home?: boolean; phoneJoin?: boolean }) {
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

  const nav = home ? HOME_NAV : SITE_NAV;
  const active = (href: string) => !href.includes("#") && (path === href || path.startsWith(href + "/"));

  return (
    <header className={cn("z-30 border-b border-line", home ? "sticky top-0 bg-card/[.97] lg:bg-card/[.96]" : "bg-card max-lg:border-0 max-lg:bg-transparent")}>
      {/* Desktop */}
      <div className={cn("mx-auto hidden h-[76px] max-w-[1280px] items-center px-14 lg:flex", home ? "gap-[30px]" : "gap-8")}>
        <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={56} height={50} priority /></Link>
        <nav aria-label="Main" className={cn("flex flex-1", home ? "gap-[26px]" : "gap-7")}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("text-[15.5px] hover:text-clay", active(n.href) ? "font-extrabold" : "font-semibold")}>{n.label}</Link>
          ))}
        </nav>
        <div className="flex gap-2.5">
          <Link href="/login" className="dc-btn dc-btn-soft h-11">Log in</Link>
          {home ? <Link href="/register" className="dc-btn dc-btn-forest h-11">Join the Village</Link> : <Link href="/register" className="dc-btn dc-btn-primary h-11">Join free</Link>}
        </div>
      </div>

      {/* Phone */}
      <div className={cn("flex items-center gap-2 lg:hidden", home ? "h-16 px-3.5" : "h-[60px] px-4")}>
        <Link href="/" aria-label="The Village Circle, home" className={cn("flex min-w-0 flex-1 items-center", home ? "gap-3" : "gap-[18px]")}>
          <Image src="/brand/mark.png" alt="" width={38} height={37} priority />
          <span className={cn("truncate font-display font-extrabold tracking-[-.01em]", home ? "text-[19px]" : "text-[20px]")}>{home ? "Village Circle" : "Village"}</span>
        </Link>
        {phoneJoin && <Link href="/register" className={cn("dc-btn px-[18px]", home ? "dc-btn-forest h-[42px]" : "dc-btn-primary h-10 px-[22px]")}>Join free</Link>}
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
          className={cn("flex items-center justify-center rounded-full bg-sand text-ink", home ? "size-11" : "size-10")}>
          <Icon name="menu" size={home ? 22 : 20} />
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
