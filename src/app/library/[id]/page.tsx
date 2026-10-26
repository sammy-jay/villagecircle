import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { Gutter, H, OTag, Pill } from "@/components/public/kit";
import { resourceDetail } from "@/lib/village";

export const dynamic = "force-dynamic";

/**
 * Public view of one library resource. P1 has no detail board, so this reuses the P1 parts;
 * the signed-in version (D19) replaces it inside the app.
 */
export default async function Resource({ params }: { params: { id: string } }) {
  const r = await resourceDetail("PUBLIC", params.id);
  if (!r) notFound();
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className="flex flex-col gap-5 pb-12 lg:max-w-[920px] lg:gap-6 lg:pb-24">
          <Link href="/library" className="inline-flex items-center gap-1.5 pt-8 text-[14px] font-bold text-clay lg:pt-14"><Icon name="arrowLeft" size={16} />Public library</Link>
          <div className="flex flex-wrap gap-2"><OTag>{r.card.kind}</OTag>{r.card.topic && <Pill>{r.card.topic}</Pill>}</div>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.12] tracking-[-.02em] lg:text-[52px] lg:tracking-[-.025em]">{r.card.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-stone">
            <span>From {r.card.credit}</span><span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-forest"><Icon name="shieldCheck" size={16} />Reviewed {r.reviewedLong}</span>
          </p>
          <article className="dc-card whitespace-pre-line p-5 text-[16.5px] leading-[1.65] text-ink lg:p-8">{r.body || "This resource is a file or recording. Log in to open it."}</article>
          {r.related.length > 0 && (
            <section className="flex flex-col gap-3">
              <H className="text-[24px]">Related</H>
              <ul className="dc-card px-5 py-0.5">
                {r.related.map((x, i) => (
                  <li key={x.id} className={i > 0 ? "border-t border-line" : ""}><Link href={`/library/${x.id}`} className="flex min-h-12 items-center justify-between gap-3 py-3 text-[15.5px] font-bold">{x.title}<Icon name="chevronRight" size={18} className="text-stone" /></Link></li>
                ))}
              </ul>
            </section>
          )}
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
