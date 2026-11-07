import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { BarShell, HelpLink, PhoneBar, TiltTile } from "@/components/account/shells";
import { Note } from "@/components/forms/fields";
import { LinkRows } from "@/components/public/kit";
import { MIN_AGE } from "@/lib/domain/age";

export const metadata = { title: "Not quite yet" };

/** M2 / DK2 Under the minimum age. Nothing about the visitor is stored (BR-20). */
export default function Under15() {
  return (
    <>
      <BarShell right={<HelpLink />} max={1000} phone={{ back: "/register", mark: false }}>
        {/* Phone */}
        <div className="flex flex-col items-start gap-4 px-2 pt-2 lg:hidden">
          <TiltTile icon="heart" tone="blush" rotate={5} />
          <h1 className="font-display text-[40px] font-extrabold leading-[1.04] tracking-[-.01em]">Not quite yet</h1>
          <p className="text-[16.5px] leading-normal text-bark">The Village Circle is for ages {MIN_AGE} and up. We cannot make an account for you yet.</p>
          <p className="text-[16.5px] leading-normal text-bark">A parent or teacher can help you find something for now.</p>
          <Note tone="mint" icon="shieldCheck" className="w-full rounded-[18px]">We have not kept your name, email or age. Nothing was saved.</Note>
          <section className="dc-card w-full px-[18px] pt-[18px]">
            <h2 className="font-display text-[19px] font-extrabold leading-[1.12]">What you can do now</h2>
            <LinkRows className="border-0 px-0" rows={[
              { href: "/families", icon: "users", tone: "mint", title: "Ask a parent or teacher", sub: "They can help you find something for your age" },
              { href: "/library", icon: "calendar", tone: "butter", title: `Come back on your ${MIN_AGE}th birthday`, sub: "You can join free then" },
              { href: "/register", icon: "message", tone: "blush", title: "Picked the wrong age?", sub: "Go back and try again" },
            ]} />
          </section>
        </div>

        {/* Desktop */}
        <div className="flex flex-col gap-5 max-lg:hidden">
          <section className="flex items-center gap-9 rounded-[36px] bg-blush px-12 py-11 text-blush-ink">
            <TiltTile icon="heart" tone="blush" size={120} rotate={6} white />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold tracking-[.05em] opacity-85">NOT ELIGIBLE YET</p>
              <h1 className="mt-2 font-display text-[64px] font-extrabold leading-none tracking-[-.02em]">Not quite yet</h1>
              <p className="mt-3 text-[18px] leading-normal">Thanks for stopping by. The Village Circle starts at {MIN_AGE}. We cannot make an account for you, and we have not kept your details.</p>
            </div>
          </section>
          <div className="dc-card p-6 text-[16px] leading-[1.55] text-bark">We can only welcome young adults aged {MIN_AGE} and over, with or without a parent&apos;s permission. This keeps every conversation safe and age-appropriate.</div>
          <div className="flex gap-5">
            <section className="flex flex-1 flex-col gap-3 rounded-[28px] bg-mint p-[26px] text-mint-ink">
              <TiltTile icon="book" tone="mint" size={56} rotate={-5} white />
              <p className="text-caption font-extrabold tracking-[.05em] opacity-80">OPEN TO EVERYONE</p>
              <h2 className="font-display text-[24px] font-extrabold leading-[1.12]">Browse the public resource library</h2>
              <p className="text-[15px] leading-normal">Advice, templates and recorded webinars shared by professionals in our community. You do not need an account.</p>
              <Link href="/library" className="dc-btn dc-btn-forest mt-1.5 h-12 self-start"><Icon name="arrowRight" size={18} />Open the library</Link>
            </section>
            <section className="flex flex-1 flex-col gap-3 rounded-[28px] bg-butter p-[26px] text-butter-ink">
              <TiltTile icon="users" tone="butter" size={56} rotate={5} white />
              <p className="text-caption font-extrabold tracking-[.05em] opacity-80">FOR FAMILIES</p>
              <h2 className="font-display text-[24px] font-extrabold leading-[1.12]">Are you a parent or guardian?</h2>
              <p className="text-[15px] leading-normal">If your young person is {MIN_AGE} to 17, they can join with you. You can set the account up together.</p>
              <Link href="/families" className="dc-btn dc-btn-ghost mt-1.5 h-12 self-start text-ink">Set up together</Link>
            </section>
          </div>
          <div className="mt-2 flex justify-center"><Link href="/" className="dc-btn dc-btn-soft h-[52px]"><Icon name="chevronLeft" size={18} />Back to the Village Circle home page</Link></div>
        </div>
      </BarShell>
      <PhoneBar><Link href="/" className="dc-btn dc-btn-soft h-[54px] w-full">Back to the start</Link></PhoneBar>
    </>
  );
}
