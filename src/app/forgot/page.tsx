import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { BarShell, PhoneBar, TiltTile } from "@/components/account/shells";
import { ForgotFlow } from "./forgot-form";

export const metadata = { title: "Reset your password" };

/** M11 / M11-D Forgot password. */
export default function Forgot({ searchParams }: { searchParams: { expired?: string } }) {
  return (
    <>
      <BarShell max={1168} right={<Link href="/login" className="font-bold text-clay">Back to log in</Link>} phone={{ back: "/login", mark: false }} className="lg:px-14 lg:pt-10">
        <div className="flex flex-col gap-3.5 px-2 pt-2 lg:hidden">
          <TiltTile icon="lock" tone="butter" size={76} />
          <h1 className="font-display text-[36px] font-extrabold leading-[1.04] tracking-[-.01em]">Reset your password</h1>
          <p className="text-[16px] leading-normal text-bark">Enter the email you joined with. If it matches an account, we will send a link that works for one hour.</p>
        </div>
        <div className="mb-[26px] flex flex-col gap-2 max-lg:hidden">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">ACCOUNT HELP</p>
          <h1 className="font-display text-[46px] font-extrabold leading-[1.12] tracking-[-.02em]">Forgot your password? It happens.</h1>
          <p className="text-[17px] leading-normal text-bark">Three quick steps. Each one lights up as you go.</p>
        </div>
        <div className="mt-5 px-2 lg:mt-0 lg:px-0"><ForgotFlow /></div>
        {searchParams.expired && (
          <section className="mt-[26px] flex items-center gap-5 rounded-[28px] bg-butter px-7 py-[22px] text-butter-ink max-lg:mx-2 max-lg:flex-col max-lg:items-start">
            <TiltTile icon="clock" tone="butter" size={56} rotate={-5} white />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[22px] font-extrabold leading-[1.12]">If the link is old</h2>
              <p className="mt-1 text-[15px] leading-normal"><b>This link has expired.</b> Reset links work once, for one hour. Nothing has changed, and your password is the same as before.</p>
            </div>
            <a href="#f-email-d" className="dc-btn dc-btn-forest h-[52px]"><Icon name="send" size={18} />Send me a new link</a>
          </section>
        )}
      </BarShell>
      <PhoneBar><button type="submit" form="forgot-form" className="dc-btn dc-btn-primary h-14 w-full">Send reset link</button></PhoneBar>
    </>
  );
}
