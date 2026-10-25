"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/dc/icons";
import { StateCard, SystemShell } from "@/components/public/system-state";

/** HP8 "Something went wrong on our side". The digest is the reference the team looks up in the logs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const ref = error.digest ? `VC-${error.digest.slice(0, 8).toUpperCase()}` : undefined;
  return (
    <SystemShell>
      <StateCard tone="blush" icon="alert" title="Something went wrong on our side" body="We have been told and are looking into it. Your work is saved." reference={ref}>
        <button type="button" onClick={reset} className="dc-btn dc-btn-primary h-[54px]"><Icon name="refresh" size={18} />Reload</button>
        <Link href="/help#contact" className="dc-btn dc-btn-ghost h-[54px]">Contact the team</Link>
      </StateCard>
    </SystemShell>
  );
}
