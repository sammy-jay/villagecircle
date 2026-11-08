import Link from "next/link";
import { Icon, type IconName } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { ContactForm } from "@/components/public/forms";
import { PublicHeader } from "@/components/public/header";
import { Eyebrow, Gutter, H, IconTile, TONE, type Tone, PAGE_STACK } from "@/components/public/kit";
import { cn } from "@/lib/cn";

export const metadata = { title: "Help centre" };

const TOPICS: { icon: IconName; tone: Tone; title: string; sub: string; topic: string }[] = [
  { icon: "rocket", tone: "butter", title: "Getting started", sub: "Signing up, the age check and guardian approval", topic: "start" },
  { icon: "message", tone: "mint", title: "Asks and conversations", sub: "Writing an Ask, scheduling, rescheduling", topic: "asks" },
  { icon: "users", tone: "blush", title: "For mentors", sub: "Application, hours, passing on an Ask", topic: "mentors" },
  { icon: "lock", tone: "butter", title: "Privacy and data", sub: "Exporting or deleting your information", topic: "privacy" },
];

/** HP3 Help centre. Search and topics go to the FAQ answers; the form creates a help request for the team. */
export default function Help() {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          <section className="pt-8 lg:flex lg:flex-col lg:items-center lg:pt-14 lg:text-center">
            <Eyebrow>Help centre</Eyebrow>
            <h1 className="mt-2.5 font-display text-[42px] font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-3 lg:text-[72px] lg:tracking-[-.03em]">How can we help?</h1>
            <p className="mt-2.5 text-[16px] leading-normal text-bark lg:mt-3 lg:text-[19px]">Pick what is closest. You will get a reply from a person, not a bot.</p>
            <form action="/faq" role="search" className="mt-4 w-full lg:mt-[26px] lg:w-[640px]">
              <label className="flex h-[52px] items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] text-[15px] text-stone focus-within:border-ink lg:h-[58px]">
                <Icon name="search" size={19} />
                <input type="search" name="q" placeholder="Search help articles" aria-label="Search help articles" className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
              </label>
            </form>
          </section>

          <section aria-label="Topics" className="flex flex-col gap-4 lg:flex-row lg:gap-[18px]">
            {TOPICS.map((t) => (
              <Link key={t.title} href={`/faq?topic=${t.topic}`} className={cn("flex flex-1 items-center gap-3.5 rounded-[22px] p-4 lg:min-h-[170px] lg:flex-col lg:items-start lg:gap-0 lg:rounded-card lg:p-[18px]", TONE[t.tone].bg, TONE[t.tone].ink)}>
                <IconTile icon={t.icon} tone={t.tone} white size={46} iconSize={23} radius={16} className="lg:hidden" />
                <IconTile icon={t.icon} tone={t.tone} white size={44} iconSize={24} radius={14} className="max-lg:hidden" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[19px] font-extrabold leading-[1.12] lg:mt-3 lg:leading-[1.15]">{t.title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-normal opacity-90 lg:mt-1 lg:leading-[1.4] lg:opacity-85">{t.sub}</span>
                </span>
                <Icon name="chevronRight" size={20} className="lg:hidden" />
              </Link>
            ))}
          </section>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-7 lg:pt-8">
            <section id="contact" className="dc-card min-w-0 flex-1 scroll-mt-6 p-5 lg:p-8">
              <H className="text-[26px] lg:text-[30px]">Contact the team</H>
              <p className="mt-1 text-[14.5px] leading-normal text-bark lg:text-[15.5px]">We reply within two business days.</p>
              <ContactForm />
            </section>
            <aside className="flex flex-col gap-4 lg:w-[380px] lg:flex-none lg:gap-[18px]">
              <section className="rounded-[26px] bg-blush p-[22px] text-blush-ink lg:rounded-[28px] lg:p-[26px]">
                <IconTile icon="flag" tone="blush" white size={48} iconSize={24} radius={16} className="mb-3.5 max-lg:hidden" />
                <H className="text-[23px] lg:text-[25px]">Something urgent or unsafe?</H>
                <p className="mt-1 text-[15px] leading-normal opacity-90 lg:mt-1.5 lg:text-[15.5px]">Use Report a concern. It is monitored every day, including weekends.</p>
                <Link href="/help/report" className="dc-btn dc-btn-outline mt-3.5 h-[50px] w-full lg:mt-4 lg:w-auto"><Icon name="flag" size={18} />Report a concern</Link>
              </section>
              <section className="dc-card p-5 lg:p-6">
                <div className="flex items-center gap-3">
                  <IconTile icon="phone" tone="mint" size={42} iconSize={21} radius={16} className="lg:hidden" />
                  <IconTile icon="phone" tone="mint" size={44} iconSize={22} radius={16} className="max-lg:hidden" />
                  <H className="text-[21px] lg:text-[22px]">Safety line</H>
                </div>
                <p className="mt-2.5 text-[15px] leading-normal text-bark lg:mt-3 lg:text-[15.5px]">Call or text 911 if someone is in danger.<span className="max-lg:hidden"> You can also call your local police or the nearest hospital.</span></p>
                <p className="mt-2.5 text-caption leading-[1.4] text-stone max-lg:hidden">Emergency number in the US. In Nigeria, call 112. Local police and hospitals can also help.</p>
              </section>
            </aside>
          </div>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
