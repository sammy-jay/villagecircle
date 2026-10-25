import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { NextStep, SplitShell, TiltTile } from "@/components/account/shells";
import { ResendVerify } from "@/components/account/resend";
import { inboxUrl } from "@/components/account/inbox";
import { cn } from "@/lib/cn";

export const metadata = { title: "Check your email" };

/** M10 / DK4 Check your email, shown after registering or when an unverified account signs in. */
export default function CheckEmail({ searchParams }: { searchParams: { email?: string } }) {
  const email = (searchParams.email ?? "").slice(0, 200);
  const inbox = email ? inboxUrl(email) : null;
  const steps: [string, string, string][] = [["Open the link", "Your email is confirmed", "Your account is active as soon as you verify."], ["Build your profile", "A guardian says yes if you are under 18", "Only your name and age are needed. The rest is up to you."], ["Ask your first question", "Build your profile and ask your first question", "Pick a topic and see what the village already knows."]];
  const tones = ["butter", "mint", "blush"] as const;
  return (
    <SplitShell panel="butter" center phone={{ back: "/register", mark: false }} art={
      <div className="flex flex-col items-start gap-[22px]">
        <h2 className="font-display text-[34px] font-extrabold leading-[1.12] text-butter-ink">What happens next</h2>
        <div className="flex w-[420px] flex-col gap-3.5">
          {steps.map(([t, , b], i) => <NextStep key={t} n={i + 1} tone={tones[i]!} title={t} body={b} rotate={[-2.5, 1.8, -1.5][i]!} />)}
        </div>
      </div>
    }>
      <TiltTile icon="mail" tone="butter" />
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.04] tracking-[-.01em] lg:text-[48px] lg:leading-[1.02] lg:tracking-[-.02em]">Check your email</h1>
        <p className="text-[16px] leading-normal text-bark lg:text-[16.5px]">We sent a link to <b>{email || "your email"}</b>. Open it to finish setting up. Nothing is active until you do.</p>
      </div>
      <div className="dc-card flex items-center gap-3.5 p-[18px] max-lg:hidden">
        <Icon name="mail" size={30} className="text-forest" />
        <p className="text-[15px] leading-normal text-bark">It can take a minute. Check your spam folder if you do not see it.</p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:gap-2.5">
        {inbox && <a href={inbox} target="_blank" rel="noreferrer" className="dc-btn dc-btn-soft h-12 lg:dc-btn-primary lg:h-[54px]"><Icon name="mail" size={18} />Open my email</a>}
        {email && <ResendVerify email={email} variant="button" className="max-lg:hidden" />}
      </div>
      {email && <ResendVerify email={email} className="lg:hidden" />}
      <section className="dc-card p-[18px] lg:hidden">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map(([, short], i) => (
            <li key={short} className="flex items-center gap-3">
              <span className={cn("flex size-[30px] flex-none items-center justify-center rounded-tile font-display text-[15px] font-extrabold", ["bg-butter text-butter-ink", "bg-mint text-mint-ink", "bg-blush text-blush-ink"][i])}>{i + 1}</span>
              <span className="text-[14.5px]">{short}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-[13.5px] leading-normal text-stone lg:text-[14.5px]">Wrong address? <Link href="/register" className="font-bold text-clay">Change it</Link> · Check your spam folder too.</p>
    </SplitShell>
  );
}
