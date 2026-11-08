import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { ButtonLink } from "@/components/dc";
import { PhoneHeader } from "@/components/account/shells";
import { LinkRows } from "@/components/public/kit";
import { WhereAreYou } from "./where";

export const metadata = { title: "Help now", robots: { index: false } };

const NOT_EMERGENCY = "We are not an emergency service. A mentor cannot help with a crisis, and that is okay.";

function TopBar({ right }: { right: string }) {
  return (
    <header className="hidden h-[76px] items-center justify-between px-14 lg:flex">
      <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={56} height={50} priority /></Link>
      <span className="text-[14.5px] text-stone">{right}</span>
    </header>
  );
}

/**
 * M23 Help now: open to anyone, signed in or not. `?from=ask` is EX9, shown after an Ask was held for crisis wording:
 * same numbers, plus "the team has seen your message".
 */
export default function Crisis({ searchParams }: { searchParams: { from?: string } }) {
  if (searchParams.from === "ask") return <AfterAsk />;
  return (
    <>
      <TopBar right="Private page. Nobody else sees this." />
      <PhoneHeader back="/" title="Help now" />
      <main id="main" className="mx-auto flex w-full max-w-[560px] flex-col gap-3.5 px-4 pb-[18px] pt-1 lg:gap-4 lg:px-0 lg:pb-14 lg:pt-7">
        <section className="rounded-[30px] bg-blush px-[22px] py-6 text-blush-ink lg:px-8 lg:py-8">
          <h1 className="font-display text-[36px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[46px]">You are not alone.</h1>
          <p className="mt-3 text-[16px] leading-normal lg:text-[17px]">If you or someone near you is in danger right now, call your local emergency number first. Then come back here.</p>
        </section>
        <WhereAreYou />
        <LinkRows className="border-0 bg-transparent px-0" rows={[
          { href: "/help#contact", icon: "message", tone: "butter", title: "Talk to the team", sub: "A real person replies today" },
          { href: "/library?q=trusted+adult", icon: "users", tone: "blush", title: "Tell a trusted adult", sub: "A parent, teacher or elder. Here is how to start" },
          { href: "/library?q=wellbeing", icon: "heart", tone: "mint", title: "Not in danger, just heavy?", sub: "Calm tips from our wellbeing library" },
        ]} />
        <section className="flex flex-col gap-2 rounded-card bg-butter p-[18px] text-butter-ink">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.02] tracking-[-.02em]">If you are worried about a friend</h2>
          <p className="text-[14px] leading-normal text-bark">Stay with them if it is safe. Tell an adult you trust. You do not have to fix it alone, and telling someone is not betraying them.</p>
        </section>
        <p className="text-[12.5px] leading-[1.4] text-stone">{NOT_EMERGENCY} Real help is one call away.</p>
      </main>
    </>
  );
}

/** EX9: the Ask was paused for crisis wording. */
function AfterAsk() {
  return (
    <>
      <TopBar right="Private page. Nobody else sees this." />
      <PhoneHeader back="/home" title="Help now" />
      <main id="main" className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-4 pb-[18px] pt-1 lg:gap-[22px] lg:px-0 lg:pb-14 lg:pt-7">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">YOU ARE NOT IN TROUBLE</p>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.03] tracking-[-.02em] lg:text-[50px]">We want to make sure you get the right kind of help</h1>
          <p className="text-[16px] leading-normal text-bark lg:text-[18px]">Thank you for being honest in your Ask. This is bigger than a mentor conversation can hold, and you deserve someone trained to help.</p>
        </div>
        <section className="flex flex-col gap-5 rounded-[30px] bg-blush px-[22px] py-6 text-blush-ink lg:flex-row lg:items-center lg:gap-7 lg:rounded-[32px] lg:px-[34px] lg:py-[30px]">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[22px] font-extrabold leading-[1.15] lg:text-[26px]">If you are in danger or may hurt yourself, get help now</h2>
            <p className="mt-2.5 text-[16px] leading-normal">Call <b>911</b>, the emergency number in the US. It is free, any hour. Tell them where you are.</p>
            <p className="mt-2.5 text-[14px] leading-normal opacity-90">Want to talk to someone? In the US you can call or text 988 at any time. In Nigeria, call 112. In other countries, search for your local crisis line.</p>
          </div>
          <a href="tel:911" className="dc-btn dc-btn-primary h-[62px] whitespace-nowrap px-9 text-[19px]"><Icon name="phone" size={18} />Call 911</a>
        </section>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
          <section className="flex-1 rounded-card border border-line bg-card p-[22px] lg:p-7">
            <span className="flex size-14 -rotate-[4deg] items-center justify-center rounded-[18px] bg-mint text-mint-ink"><Icon name="users" size={28} /></span>
            <h2 className="mt-3.5 font-display text-[22px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[24px]">Talk to someone you trust</h2>
            <p className="mt-2 text-[15.5px] leading-normal text-bark">A parent, guardian, teacher, counsellor or coach. You do not have to explain everything. You can say:</p>
            <p className="mt-3 border-l-4 border-forest pl-3.5 text-[17px] font-bold leading-[1.4]">I am not okay and I need to talk.</p>
          </section>
          <section className="flex-1 rounded-card border border-line bg-card p-[22px] lg:p-7">
            <span className="flex size-14 rotate-[4deg] items-center justify-center rounded-[18px] bg-butter text-butter-ink"><Icon name="shieldCheck" size={28} /></span>
            <h2 className="mt-3.5 font-display text-[22px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[24px]">Our team has seen your message</h2>
            <p className="mt-2 text-[15.5px] leading-normal text-bark">A senior member of our team will follow up within 24 hours. Your Ask is paused, not cancelled, and nobody else sees what you wrote.</p>
          </section>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <p className="max-w-[520px] text-[14.5px] leading-normal text-stone">{NOT_EMERGENCY} Real help is a call away.</p>
          <ButtonLink href="/help#contact" variant="ghost" icon="message" className="h-[52px] shrink-0">Talk to the team now</ButtonLink>
        </div>
      </main>
    </>
  );
}
