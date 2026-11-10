import Link from "next/link";
import { Icon, type IconName } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { CtaBand, Eyebrow, Gutter, H, IconTile, RingAvatar, TONE, type Tone, PAGE_STACK, SECTION_STACK } from "@/components/public/kit";
import { cn } from "@/lib/cn";

export const metadata = { title: "About us" };

/** The client's four points on how The Village Circle differs from other mentoring communities. */
const DIFFERENT: { icon: IconName; tone: Tone; title: string; body: string }[] = [
  { icon: "users", tone: "butter", title: "African community identity", body: "We recreate the traditional African idea that raising and guiding the next generation is a shared community responsibility." },
  { icon: "clock", tone: "mint", title: "Accessible professional mentorship", body: "Experienced African professionals can give as little as one hour a month, so more people can take part." },
  { icon: "shieldCheck", tone: "blush", title: "Parent-led access for minors", body: "Parents and responsible adults can seek guidance on behalf of children under 18." },
  { icon: "message", tone: "butter", title: "Ask the Village", body: "Practical advice for a specific education or career decision, without a long-term mentorship commitment." },
];

/** HP1 About: the client's story of the village, what we do, and how we are different. */
export default function About() {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          {/* Hero: the promise, beside the proverb the whole idea grows from. */}
          <section className="flex flex-col gap-8 pt-8 lg:flex-row lg:items-center lg:gap-14 lg:pt-14">
            <div className="min-w-0 flex-1">
              <Eyebrow>About us</Eyebrow>
              <h1 className="mt-3 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-.02em] lg:text-[64px] lg:leading-[1.02] lg:tracking-[-.025em]">
                Rebuilding the Village.<br /><span className="text-clay">Empowering the Next Generation.</span>
              </h1>
              <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-bark lg:text-[19px]">A community-driven mentorship initiative connecting students and young adults with experienced African professionals who are willing to share their knowledge, experience and networks.</p>
            </div>
            <figure className="relative flex flex-col gap-5 overflow-hidden rounded-[32px] bg-forest p-7 text-forest-ink lg:w-[400px] lg:flex-none lg:rounded-[36px] lg:p-9">
              <span className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" aria-hidden="true" />
              <div className="relative flex" aria-hidden="true"><RingAvatar initials="KM" tone="butter" size={52} /><RingAvatar initials="TA" tone="mint" size={52} className="-ml-3" /><RingAvatar initials="IB" tone="blush" size={52} className="-ml-3" /></div>
              <blockquote className="relative font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[36px]">&ldquo;It takes a village to raise a child.&rdquo;</blockquote>
              <figcaption className="relative text-[14.5px] text-white/85">An African proverb, and the reason we exist.</figcaption>
            </figure>
          </section>

          {/* The story: the village, the gap the diaspora feels, and why we were created. */}
          <section className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <Eyebrow>Our story</Eyebrow>
              <H className="mt-3 text-[30px] lg:text-[44px]">The village has always been there. Until it was not.</H>
            </div>
            <div className="flex flex-col gap-5 text-[17px] leading-relaxed text-bark lg:text-[18px]">
              <p>In African communities, the village has always been a source of wisdom, guidance and opportunity.</p>
              <p>But for many families living in the diaspora, these traditional support networks are no longer within reach.</p>
              <p className="rounded-[22px] bg-butter px-6 py-5 font-display text-[22px] font-extrabold leading-[1.25] text-butter-ink lg:text-[26px]">The Village Circle was created to bridge that gap.</p>
            </div>
          </section>

          {/* What we do: Ask the Village, and the belief behind it. */}
          <section className={SECTION_STACK}>
            <div>
              <Eyebrow>What we do</Eyebrow>
              <H className="mt-3 max-w-[820px] text-[30px] lg:text-[44px]">Trusted guidance, one conversation at a time</H>
            </div>
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div className="dc-card flex flex-col gap-4 p-6 lg:p-8">
                <IconTile icon="message" tone="mint" size={52} iconSize={26} />
                <H as="h3" className="text-[24px] lg:text-[28px]">&ldquo;Ask the Village&rdquo;</H>
                <p className="text-[16px] leading-relaxed text-bark lg:text-[17px]">Through Ask the Village, we make it easier for young people and families to access trusted guidance on education, career choices and personal development.</p>
                <Link href="/#how" className="inline-flex items-center gap-1.5 self-start text-[15px] font-bold text-clay">See how it works<Icon name="arrowRight" size={16} strokeWidth={2.5} /></Link>
              </div>
              <div className="flex flex-col justify-between gap-6 rounded-card bg-blush p-6 text-blush-ink lg:p-8">
                <IconTile icon="heart" tone="blush" white size={52} iconSize={26} />
                <div>
                  <p className="text-[16px] leading-relaxed lg:text-[17px]">We believe mentorship does not have to be complicated or time-consuming.</p>
                  <p className="mt-3 font-display text-[24px] font-extrabold leading-[1.2] lg:text-[28px]">Sometimes, one meaningful conversation can change the direction of someone&apos;s future.</p>
                </div>
              </div>
            </div>
          </section>

          {/* How we are different: the client's four points. */}
          <section className={SECTION_STACK}>
            <div>
              <Eyebrow>How we are different</Eyebrow>
              <H className="mt-3 max-w-[820px] text-[30px] lg:text-[44px]">Mentoring, the way the village always did it</H>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {DIFFERENT.map((d) => (
                <div key={d.title} className={cn("flex flex-col gap-4 rounded-[26px] p-6 lg:rounded-[30px] lg:p-8", TONE[d.tone].bg, TONE[d.tone].ink)}>
                  <IconTile icon={d.icon} tone={d.tone} white size={52} iconSize={26} />
                  <H as="h3" className="text-[22px] lg:text-[26px]">{d.title}</H>
                  <p className="text-[15.5px] leading-relaxed opacity-90 lg:text-[16.5px]">{d.body}</p>
                </div>
              ))}
            </div>
          </section>

          <CtaBand tone="butter" title="Together, we're rebuilding the village, one connection at a time." sub="Join in two minutes. Under 18s join with a parent or guardian.">
            <Link href="/register" className="dc-btn dc-btn-primary h-[54px] lg:h-14"><Icon name="arrowRight" size={18} />Start an Ask</Link>
            <Link href="/become-a-mentor" className="dc-btn dc-btn-outline h-[50px] lg:h-14">Be a Mentor</Link>
          </CtaBand>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
