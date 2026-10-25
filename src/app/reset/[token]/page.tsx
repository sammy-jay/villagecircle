import Link from "next/link";
import { BarShell, TiltTile } from "@/components/account/shells";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Choose a new password" };

/** M11-M2 Choose a new password (from the emailed link). The token is checked on save. */
export default function Reset({ params }: { params: { token: string } }) {
  return (
    <BarShell max={560} right={<Link href="/login" className="font-bold text-clay">Back to log in</Link>} phone={{ back: "/login", mark: false }}>
      <div className="flex flex-col gap-3.5 px-2 pt-2 lg:dc-card lg:gap-4 lg:p-[26px]">
        <TiltTile icon="lock" tone="blush" size={64} rotate={6} className="max-lg:hidden" />
        <h1 className="font-display text-[36px] font-extrabold leading-[1.04] tracking-[-.01em] lg:text-[30px] lg:leading-[1.12]">Choose a new password</h1>
        <p className="text-[16px] leading-normal text-bark lg:hidden">Pick something you have not used on other sites.</p>
        <div className="pt-1.5 lg:pt-0"><ResetForm token={params.token} /></div>
      </div>
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </BarShell>
  );
}
