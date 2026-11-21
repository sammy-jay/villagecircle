"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { bellAction, bellReadAction, bellReadAllAction, type BellItem } from "@/app/notify-actions";
import { cn } from "@/lib/cn";
import { LIVE_EVENT } from "./live-updates";

const SNOOZE_KEY = "vc-urgent-snooze";
const SEEN_KEY = "vc-bell-seen";
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked: the pop-up just shows again */ } };

/**
 * NT3 Notifications: the panel from the bell (desktop top bar), a pop-up for urgent unread items with "Remind me in 15 min",
 * and toasts that leave after 6 seconds when something new arrives while the page is open. Checks again every minute.
 */
export function NotificationBell({ initialUnread }: { initialUnread?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ items: BellItem[]; unread: number } | null>(null);
  const [toasts, setToasts] = useState<BellItem[]>([]);
  const [urgent, setUrgent] = useState<BellItem | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const d = await bellAction(); setData(d);
    const seen = Number(read(SEEN_KEY) ?? 0);
    const fresh = d.items.filter((i) => i.unread && +new Date(i.at) > seen);
    if (seen && fresh.length) { setToasts((t) => [...fresh.filter((f) => !f.urgent), ...t].slice(0, 3)); }
    if (d.items.length) write(SEEN_KEY, String(Math.max(seen, ...d.items.map((i) => +new Date(i.at)))));
    const snoozed = Number(read(SNOOZE_KEY) ?? 0) > Date.now();
    setUrgent(snoozed ? null : d.items.find((i) => i.urgent && i.unread) ?? null);
  }, []);

  // Reload when the page's live check sees a change (seconds), and every minute as a fallback.
  useEffect(() => {
    void load(); const t = setInterval(() => void load(), 60_000);
    const onLive = () => void load(); window.addEventListener(LIVE_EVENT, onLive);
    return () => { clearInterval(t); window.removeEventListener(LIVE_EVENT, onLive); };
  }, [load]);
  useEffect(() => { if (!toasts.length) return; const t = setTimeout(() => setToasts((x) => x.slice(0, -1)), 6000); return () => clearTimeout(t); }, [toasts]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const go = async (i: BellItem) => { setOpen(false); setUrgent(null); await bellReadAction(i.id); router.push(i.link ?? "/notifications"); router.refresh(); };
  const unread = data ? data.unread > 0 : !!initialUnread;

  return (
    <div ref={wrap} className="relative">
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) void load(); }} aria-expanded={open} aria-haspopup="dialog" aria-label={unread ? `Notifications, ${data?.unread ?? "new"} unread` : "Notifications"} className="relative flex size-11 items-center justify-center rounded-full bg-sand">
        <Icon name="bell" size={21} />
        {unread && <span className="absolute right-[9px] top-2 size-2.5 rounded-full border-2 border-sand bg-clay" />}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-[54px] z-40 w-[380px] rounded-[24px] border border-line bg-card p-3 shadow-[0_18px_40px_rgba(29,25,20,.16)]">
          <div className="flex items-center justify-between px-2 pb-2 pt-1"><h2 className="font-display text-[19px] font-extrabold">Notifications</h2>{unread && <button type="button" onClick={async () => { await bellReadAllAction(); await load(); router.refresh(); }} className="text-[13px] font-bold text-clay">Mark all read</button>}</div>
          {data?.items.length ? (
            <ul className="flex flex-col">
              {data.items.map((i) => (
                <li key={i.id}><button type="button" onClick={() => void go(i)} className="flex w-full gap-3 rounded-[16px] px-2.5 py-2.5 text-left hover:bg-sand">
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", i.unread ? (i.urgent ? "bg-clay" : "bg-forest") : "bg-transparent")} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><b className={cn("block text-[14.5px] leading-snug", !i.unread && "font-semibold")}>{i.title}</b><span className="line-clamp-2 block text-[13px] text-bark">{i.body}</span><span className="text-[12px] text-stone">{i.when}</span></span>
                </button></li>
              ))}
            </ul>
          ) : <p className="px-2 py-4 text-[14px] text-bark">{data ? "Nothing here yet." : "Loading…"}</p>}
          <Link href="/notifications" onClick={() => setOpen(false)} className="mt-1 block rounded-[14px] px-2.5 py-2.5 text-center text-[14px] font-bold text-clay hover:bg-sand">See all notifications</Link>
        </div>
      )}
      {urgent && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(20,16,10,.45)] lg:items-center">
          <div role="alertdialog" aria-modal="true" aria-labelledby="urgent-t" className="w-full rounded-t-[28px] bg-card p-6 lg:w-[460px] lg:rounded-[28px]">
            <span className="flex size-12 items-center justify-center rounded-[16px] bg-blush text-blush-ink"><Icon name="alert" size={24} /></span>
            <h2 id="urgent-t" className="mt-3 font-display text-[23px] font-extrabold leading-tight">{urgent.title}</h2>
            <p className="mt-1.5 text-[15px] leading-normal text-bark">{urgent.body}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" autoFocus onClick={() => void go(urgent)} className="dc-btn dc-btn-primary h-[52px]">Open it now</button>
              <button type="button" onClick={() => { write(SNOOZE_KEY, String(Date.now() + 15 * 60_000)); setUrgent(null); }} className="dc-btn dc-btn-ghost h-[48px]">Remind me in 15 min</button>
            </div>
          </div>
        </div>
      )}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60] flex w-[340px] flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-[20px] bg-ink p-4 text-paper shadow-lg">
              <Icon name="bell" size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1"><b className="block text-[14.5px]">{t.title}</b><span className="line-clamp-2 block text-[13px] opacity-80">{t.body}</span></span>
              <button type="button" onClick={() => void go(t)} className="text-[13px] font-bold text-butter">View</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
