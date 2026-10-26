import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { FaqBrowser } from "@/components/public/accordion";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { Gutter, H, Hero, IconTile, LinkRows, PAGE_STACK } from "@/components/public/kit";
import { FAQ } from "@/lib/public-content";

export const metadata = { title: "FAQ" };

/** HP2 FAQ. */
export default function Faq({ searchParams }: { searchParams: { q?: string; topic?: string } }) {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          <Hero eyebrow="FAQ" title="Questions, answered plainly." size={[40, 64]} sub="Cannot find yours? Contact the team. A person replies within two business days." />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10 lg:pt-3">
            <div className="min-w-0 flex-1"><FaqBrowser items={FAQ} initialQ={searchParams.q ?? ""} topic={searchParams.topic} /></div>
            <aside className="flex flex-col gap-4 lg:w-[370px] lg:flex-none lg:gap-[18px]">
              <section className="rounded-[26px] bg-mint p-[22px] text-mint-ink lg:rounded-[28px] lg:p-[26px]">
                <IconTile icon="message" tone="mint" white size={48} iconSize={24} radius={16} className="mb-3.5 max-lg:hidden" />
                <H className="text-[24px] lg:text-[26px]">Still stuck?</H>
                <p className="mt-1 text-[15px] leading-normal opacity-90 lg:mt-1.5 lg:text-[15.5px]">Our help team reads every message.</p>
                <Link href="/help#contact" className="dc-btn dc-btn-forest mt-3.5 h-[52px] w-full lg:mt-4 lg:h-[50px] lg:w-auto">Contact the team</Link>
              </section>
              <section className="rounded-[26px] bg-blush p-[22px] text-blush-ink lg:rounded-[28px] lg:p-[26px]">
                <IconTile icon="flag" tone="blush" white size={48} iconSize={24} radius={16} className="mb-3.5 max-lg:hidden" />
                <H className="text-[24px] lg:text-[26px]">Something feels wrong?</H>
                <p className="mt-1 text-[15px] leading-normal opacity-90 lg:mt-1.5 lg:text-[15.5px]">Report it in one step. We pause the connection and a safeguarding lead is told straight away.</p>
                <Link href="/help/report" className="dc-btn dc-btn-outline mt-3.5 h-[52px] w-full lg:mt-4 lg:h-[50px] lg:w-auto"><Icon name="flag" size={18} />Report a concern</Link>
              </section>
              <LinkRows className="max-lg:hidden" rows={[
                { href: "/help", icon: "book", tone: "butter", title: "Help centre", sub: "Guides for signing up, Asks and privacy" },
                { href: "/families", icon: "shieldCheck", tone: "mint", title: "For families", sub: "How guardians stay in charge" },
                { href: "/become-a-mentor", icon: "users", tone: "blush", title: "Become a mentor", sub: "Give an hour, change a week" },
              ]} />
            </aside>
          </div>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
