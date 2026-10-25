import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { Gutter, H, LinkRows, OTag } from "@/components/public/kit";

export const metadata = { title: "Page not found" };

const TRY = [
  { href: "/library", icon: "book", tone: "mint", title: "The public library", sub: "Advice, templates and recordings from mentors", subPhone: "Advice and templates" },
  { href: "/become-a-mentor", icon: "users", tone: "butter", title: "Become a mentor", sub: "Give an hour and change a week", subPhone: "Give an hour" },
  { href: "/families", icon: "shieldCheck", tone: "blush", title: "For families", sub: "How guardians stay in charge" },
] as const;

/** The tilted 404 tile, sized for phone or desktop. */
function Art({ phone }: { phone?: boolean }) {
  return phone ? (
    <div className="relative mt-1.5 h-[210px] lg:hidden" aria-hidden="true">
      <div className="absolute left-0 top-6 h-[170px] w-[300px] -rotate-[5deg] rounded-[40px] bg-butter" />
      <div className="absolute left-6 top-10 -rotate-[5deg] font-display text-[128px] font-extrabold leading-none tracking-[-.05em] text-butter-ink">404</div>
      <div className="absolute right-3.5 top-0 flex size-[78px] rotate-[8deg] items-center justify-center rounded-[26px] bg-blush text-blush-ink"><Icon name="compass" size={40} /></div>
    </div>
  ) : (
    <div className="relative h-[340px] w-[520px] flex-none max-lg:hidden" aria-hidden="true">
      <div className="absolute left-0 top-10 h-[280px] w-[440px] -rotate-[5deg] rounded-[56px] bg-butter" />
      <div className="absolute left-[60px] top-[70px] -rotate-[5deg] font-display text-[200px] font-extrabold leading-none tracking-[-.05em] text-butter-ink">404</div>
      <div className="absolute right-0 top-0 flex size-[110px] rotate-[8deg] items-center justify-center rounded-[36px] bg-blush text-blush-ink"><Icon name="compass" size={56} /></div>
    </div>
  );
}

/** HP6 Page not found. */
export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className="flex flex-col gap-4 lg:gap-0">
          <Art phone />
          <section className="flex items-center gap-10 lg:pb-10 lg:pt-[90px]">
            <div className="flex flex-1 flex-col gap-4 lg:gap-5">
              <div>
                <OTag className="text-blush-ink">Page not found</OTag>
                <h1 className="mt-3 font-display text-[38px] font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-5 lg:text-[60px] lg:leading-[1.02] lg:tracking-[-.025em]">We cannot find that page.</h1>
                <p className="mt-2.5 text-[16.5px] leading-normal text-bark lg:mt-5 lg:max-w-[520px] lg:text-[19px]">The page may have moved, or the link may be old. Nothing is wrong with your account.</p>
              </div>
              <div className="flex flex-col gap-4 lg:flex-row lg:gap-3">
                <Link href="/" className="dc-btn dc-btn-primary h-14"><Icon name="home" size={18} />Go to the home page</Link>
                <Link href="/help" className="dc-btn dc-btn-soft h-[54px] lg:h-14">Visit the help centre</Link>
              </div>
              <p className="text-[15px] text-stone max-lg:text-center">Looking for your Asks? <Link href="/login" className="font-bold text-clay">Log in</Link></p>
            </div>
            <Art />
          </section>
          <section className="flex flex-col gap-4 lg:pt-5">
            <H className="text-[28px] max-lg:hidden">Or try one of these</H>
            <LinkRows className="lg:hidden" rows={[...TRY]} />
            <div className="flex gap-[18px] max-lg:hidden">
              {TRY.map((r) => <LinkRows key={r.href} className="flex-1" rows={[{ ...r, subPhone: undefined }]} />)}
            </div>
          </section>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
