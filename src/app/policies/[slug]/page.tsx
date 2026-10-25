import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Accordion } from "@/components/public/accordion";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { Gutter, H, Pill } from "@/components/public/kit";
import { POLICIES, POLICY_PLACEHOLDER, policyBySlug } from "@/lib/public-content";
import { cn } from "@/lib/cn";
import { PolicyPicker, PrintButton } from "./client";

export function generateStaticParams() { return POLICIES.map((p) => ({ slug: p.slug })); }
export function generateMetadata({ params }: { params: { slug: string } }) { return { title: policyBySlug(params.slug)?.title ?? "Policies" }; }

const SECTION_PENDING = "This section's full text is being finalised with counsel before launch.";

/** PO-1 Policies: one policy with versioning, sections and the other policies in a side menu. */
export default function Policy({ params }: { params: { slug: string } }) {
  const p = policyBySlug(params.slug);
  if (!p) notFound();
  const sections = p.sections.map((title, i) => ({ title, label: `SECTION ${i + 1}`, body: i === 0 && p.firstBody ? p.firstBody : SECTION_PENDING }));

  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className="flex flex-col gap-3.5 pt-3 lg:flex-row lg:items-start lg:gap-10 lg:pt-12">
          <nav aria-label="Policies" className="flex w-[290px] flex-none flex-col gap-1.5 max-lg:hidden lg:sticky lg:top-5">
            <H className="px-4 pb-2.5 text-[24px]">Policies</H>
            {POLICIES.map((x) => {
              const on = x.slug === p.slug;
              return (
                <Link key={x.slug} href={`/policies/${x.slug}`} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-field px-4 py-[13px] text-[15.5px] text-ink hover:bg-sand", on ? "bg-sand font-extrabold" : "font-semibold")}>
                  <Icon name="doc" size={19} className={on ? "text-ink" : "text-stone"} />{x.nav}
                </Link>
              );
            })}
            <div className="mt-[18px] px-1">
              <div className="dc-card p-[18px]">
                <p className="text-[13px] font-bold text-bark">Need help?</p>
                <a href="mailto:help@thevillagecircle.org" className="mt-1 block text-[14.5px] text-bark">help@thevillagecircle.org</a>
              </div>
            </div>
          </nav>

          <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-[18px]">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="mint">Version {p.version}</Pill>
                <Pill className="max-lg:text-caption">Effective {p.effective}</Pill>
              </div>
              <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-4 lg:text-[52px] lg:tracking-[-.025em]">{p.title}</h1>
              <p className="mt-2 text-[15.5px] leading-normal text-bark lg:mt-2.5 lg:text-[17px]">{p.accepted}</p>
            </header>
            <PolicyPicker current={p.slug} options={POLICIES.map((x) => ({ value: x.slug, label: x.nav }))} />
            <section className="rounded-card bg-mint p-5 text-mint-ink lg:rounded-[26px] lg:p-[26px]">
              <p className="text-caption font-extrabold tracking-[.05em]">IN SHORT</p>
              <p className="mt-1.5 text-[15.5px] leading-[1.6] lg:mt-2 lg:text-[17px]">{p.short}</p>
            </section>
            <H className="text-[24px] lg:mt-1.5 lg:text-[26px]">Sections</H>
            <Accordion key={p.slug} items={sections} variant="section" gap="gap-3.5 lg:gap-[18px]" />
            <p className="flex items-center gap-2.5 text-caption leading-[1.4] text-stone lg:px-1 lg:py-1.5 lg:text-[13.5px]">
              <Icon name="info" size={18} className="max-lg:hidden" />
              <span><span className="lg:hidden">The full policy text is written by The Village Circle and confirmed with counsel before launch.</span><span className="max-lg:hidden">{POLICY_PLACEHOLDER}</span></span>
            </p>
          </div>

          <aside className="flex flex-col gap-3 lg:sticky lg:top-5 lg:w-[260px] lg:flex-none">
            <PrintButton />
            <Link href="/help/report" className="dc-btn dc-btn-soft h-[52px] w-full"><Icon name="flag" size={18} />Report a concern</Link>
            <div className="dc-card p-5 max-lg:hidden">
              <p className="text-[13px] font-bold text-bark">Version history</p>
              <ul className="mt-2 text-[14.5px] leading-[1.7]">
                <li><b>{p.version}</b> {p.effective}</li>
                {p.history?.map(([v, d]) => <li key={v}><span className="text-stone">{v}</span> {d}</li>)}
              </ul>
            </div>
          </aside>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
