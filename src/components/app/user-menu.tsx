"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

/** The person chip in the top bar. It opens a small menu with their profile and sign out, for every role. */
export function UserMenu({ name, roleLabel, initials, tone, profileHref, signOutTo = "/signed-out" }: { name: string; roleLabel: string; initials: string; tone: string; profileHref: string; signOutTo?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const item = "flex h-11 items-center gap-3 rounded-tile px-3.5 text-[15px] font-semibold text-ink hover:bg-sand";
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-left hover:bg-sand">
        <span className={cn("flex size-11 items-center justify-center rounded-full font-display text-[16px] font-bold", tone)} aria-hidden="true">{initials}</span>
        <span className="whitespace-nowrap text-[14px] leading-[1.25]"><b>{name}</b><br /><span className="text-stone">{roleLabel}</span></span>
        <Icon name="chevronDown" size={16} className={cn("text-stone transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="dc-menu absolute right-0 top-[56px] z-40 w-[240px] p-2">
          <Link role="menuitem" href={profileHref} onClick={() => setOpen(false)} className={item}><Icon name="user" size={20} />Profile and settings</Link>
          <button role="menuitem" type="button" onClick={() => signOut({ callbackUrl: signOutTo })} className={cn(item, "w-full")}><Icon name="logout" size={20} />Sign out</button>
        </div>
      )}
    </div>
  );
}
