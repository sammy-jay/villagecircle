"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/dc/icons";

export const CONSENT_COOKIE = "vc-consent";
const readConsent = () => document.cookie.split("; ").find((c) => c.startsWith(CONSENT_COOKIE + "="))?.split("=")[1];

/**
 * HP5 cookie and privacy banner. Dims the page; a card on desktop, a bottom sheet on the phone.
 * Stores "all" (anonymous counts allowed) or "essential" in the vc-consent cookie for a year.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [counts, setCounts] = useState(false);
  useEffect(() => { if (!readConsent()) setShow(true); }, []);
  if (!show) return null;

  const save = (v: "all" | "essential") => {
    document.cookie = `${CONSENT_COOKIE}=${v}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    window.dispatchEvent(new CustomEvent("vc-consent", { detail: v }));
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <div className="absolute inset-0 bg-[rgba(20,16,10,.55)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] bg-card px-[22px] pb-[26px] pt-3.5 shadow-[0_-20px_60px_rgba(0,0,0,.3)] lg:inset-x-14 lg:bottom-9 lg:mx-auto lg:flex lg:max-w-[1168px] lg:items-center lg:gap-[30px] lg:rounded-[32px] lg:px-[34px] lg:py-[30px] lg:shadow-[0_24px_70px_rgba(0,0,0,.35)]">
        <span className="mx-auto mb-4 block h-[5px] w-11 rounded-[3px] bg-line lg:hidden" aria-hidden="true" />
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-field bg-butter text-butter-ink lg:size-16"><Icon name="shieldCheck" size={26} className="lg:hidden" /><Icon name="shieldCheck" size={32} className="max-lg:hidden" /></span>
        <div className="min-w-0 flex-1 max-lg:mt-3">
          <h2 id="cookie-title" className="font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em]">We keep this simple</h2>
          <p className="mt-2 text-[15px] leading-normal text-bark lg:mt-1.5 lg:max-w-[700px] lg:text-[15.5px]">We use only what is needed to keep the site working and safe. If you agree, we also use anonymous counts to improve it. We never sell data and never use it to follow anyone around the web.</p>
          <Link href="/policies/privacy" className="mt-2.5 inline-block text-[13.5px] font-bold text-clay max-lg:hidden">Read the privacy page</Link>
          {choosing && (
            <label className="mt-3.5 flex items-center justify-between gap-4 rounded-field border border-line px-4 py-3">
              <span><span className="block text-[15px] font-bold">Anonymous counts</span><span className="block text-caption text-stone">Page views and button taps, with no names</span></span>
              <button type="button" role="switch" aria-checked={counts} onClick={() => setCounts(!counts)} className={`relative h-7 w-[46px] shrink-0 rounded-full transition-colors ${counts ? "bg-forest" : "bg-line"}`}>
                <span className={`absolute top-[3px] size-[22px] rounded-full bg-card shadow transition-[left] ${counts ? "left-[21px]" : "left-[3px]"}`} />
              </button>
            </label>
          )}
        </div>
        <div className="mt-[18px] flex flex-col gap-2.5 lg:mt-0 lg:w-[250px] lg:flex-none">
          {choosing ? (
            <button type="button" onClick={() => save(counts ? "all" : "essential")} className="dc-btn dc-btn-primary h-[54px] lg:h-[52px]">Save my choice</button>
          ) : (
            <>
              <button type="button" onClick={() => save("all")} className="dc-btn dc-btn-primary h-[54px] lg:h-[52px]">Accept anonymous counts</button>
              <button type="button" onClick={() => save("essential")} className="dc-btn dc-btn-ghost h-[54px] lg:h-[52px]">Only what is needed</button>
              <button type="button" onClick={() => setChoosing(true)} className="py-2.5 text-center text-[15px] font-bold text-bark underline lg:py-0 lg:text-[14.5px]">Choose</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
