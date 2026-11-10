import { Icon } from "@/components/dc/icons";
import { ArtCard, SplitShell } from "@/components/account/shells";
import { RingAvatar } from "@/components/public/kit";
import { MIN_AGE } from "@/lib/domain/age";
import type { SignupRole } from "@/lib/register";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Join now" };

const COPY: Record<SignupRole, { eyebrow: string; sub: string }> = {
  participant: { eyebrow: "Join now", sub: "Two minutes. Mentors see your first name and age band, nothing else." },
  mentor: { eyebrow: "Join as a mentor", sub: "Create your account first. Next you tell us about yourself and sign the safeguarding commitment." },
  guardian: { eyebrow: "Join as a parent or guardian", sub: "Create your guardian account. Your young person can then invite you, or you can set them up together." },
};

function Art() {
  return (
    <div className="flex flex-col items-center gap-[30px]">
      <div className="relative h-[520px] w-[420px]">
        <ArtCard rotate={-4} className="absolute left-0 top-2.5 w-[300px] border border-line p-4 shadow-none">
          <div className="flex items-center gap-2.5">
            <span className="flex size-[38px] items-center justify-center rounded-full bg-mint font-display text-[14px] font-bold text-mint-ink">BO</span>
            <p className="text-[14px] font-bold">Dr Bisi O.<span className="block text-[12px] font-medium text-stone">Medicine</span></p>
          </div>
          <p className="mt-3 rounded-[18px] bg-mint p-4 font-display text-[22px] font-extrabold leading-[1.15] text-mint-ink">5 things I wish I knew before choosing a degree</p>
        </ArtCard>
        <div className="absolute right-0 top-[170px] w-[290px] rotate-3 rounded-[26px] bg-blush p-[18px] text-blush-ink">
          <p className="font-display text-[21px] font-bold leading-[1.2]">&quot;I finally know what to do this year. I almost did not ask.&quot;</p>
          <p className="mt-3 text-[13px]"><b>Tunde, 17</b> thanked Sam E.</p>
        </div>
        <div className="absolute left-5 top-[340px] w-[300px] -rotate-2 rounded-card bg-butter p-[18px] text-butter-ink">
          <div className="flex items-center gap-2.5"><span className="dc-pill border-butter-ink text-[12.5px] text-ink">Your Ask</span><span className="text-[12.5px] font-bold">Step 3 of 4</span></div>
          <p className="mt-2.5 font-display text-[20px] font-extrabold">Dr Bisi stepped forward</p>
        </div>
        <RingAvatar initials="SE" tone="butter" size={62} className="absolute right-5 top-0" />
      </div>
      <div className="dc-card flex w-[380px] flex-col gap-2.5 p-5">
        {["No direct messages, ever", "First names and age bands only", "A guardian says yes for under 18s", "The team reads every Ask first"].map((t) => (
          <p key={t} className="flex items-center gap-2.5 text-[14.5px] font-semibold"><Icon name="check" size={18} strokeWidth={2.8} className="text-forest" />{t}</p>
        ))}
      </div>
    </div>
  );
}

/** M1 / DK1 Register. `?role=mentor|guardian` changes the copy and the age rule. */
export default function Register({ searchParams }: { searchParams: { role?: string } }) {
  const role: SignupRole = searchParams.role === "mentor" || searchParams.role === "guardian" ? searchParams.role : "participant";
  const c = COPY[role];
  return (
    <SplitShell width="half" panel="mint" art={<Art />} phone={{ back: "/", title: "Join now", mark: false }}>
      <div className="lg:mt-1.5">
        <p className="text-[13px] font-extrabold uppercase tracking-[.04em] text-clay max-lg:hidden">{c.eyebrow}</p>
        <h1 className="font-display text-[36px] font-extrabold leading-[1.12] tracking-[-.01em] lg:mt-2 lg:text-[46px] lg:leading-[1.02] lg:tracking-[-.02em]">Make your space.</h1>
        <p className="mt-2.5 text-[16px] leading-normal text-bark max-lg:hidden">{c.sub}</p>
      </div>
      <RegisterForm role={role} minAge={MIN_AGE} />
    </SplitShell>
  );
}
