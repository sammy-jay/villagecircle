import Link from "next/link";
import { Accordion } from "@/components/public/accordion";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { BuiltForSafety, FinalCta, HOME_X, HOME_Y, HomeHero, HowItWorks, SectionHead, ThanksWall, TrustStrip, WhoItIsFor, type WallCard } from "@/components/public/home";
import { MIN_AGE } from "@/lib/domain/age";
import { FAQ } from "@/lib/public-content";
import { thanksWall } from "@/lib/village";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

/** Board samples, shown only outside production when the database has nothing yet. */
const DEV = process.env.NODE_ENV !== "production";
const SAMPLE_THANKS: WallCard[] = [
  { id: "s1", quote: "\"Now I know what to say in my first customer call.\"", who: "Emeka, 22 thanked Tomi A." },
  { id: "s2", quote: "\"Kind and direct. I left with a plan.\"", who: "Kemi, 16 thanked Dr Bisi" },
  { id: "s3", quote: "\"She made scholarship forms feel doable.\"", who: "Funke, 19 thanked Ife B." },
  { id: "s4", quote: "\"I finally know what to do this year. I almost did not ask.\"", who: "Tunde, 17 thanked Sam E." },
];

async function safe<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try { return await f(); } catch (e) { console.error("landing data", e); return fallback; }
}

const faqA = (q: string) => FAQ.find((f) => f.q === q)?.a ?? "";
const HOME_FAQ = [
  { title: "Is it really free?", body: "Yes. Joining, asking and meeting a mentor cost nothing. Mentors give their hour as a gift." },
  { title: "Who can join?", body: faqA("Who can join?") },
  { title: "Can a mentor message me or see my school?", body: faqA("Can a mentor contact me directly?") },
  { title: "What if something goes wrong?", body: "Report a concern from any page. The connection pauses straight away and our safeguarding lead is told. We resolve every report within 48 hours." },
];

/**
 * Main landing (V-Main), trimmed to the essentials: what it is, how it works, who it is for, proof, safety, a short FAQ.
 * Events, the library, mentors, parents and mentoring each have their own page, linked from the header and from "Who it is for".
 */
export default async function Home() {
  const thanks = await safe(() => thanksWall(4), []);
  const wall = thanks.length || !DEV ? thanks.map((t) => ({ id: t.id, quote: t.quote, who: t.who })) : SAMPLE_THANKS;
  return (
    <>
      <PublicHeader />
      <main id="main" className="overflow-x-clip">
        <HomeHero minAge={MIN_AGE} />
        <TrustStrip />
        <HowItWorks />
        <WhoItIsFor minAge={MIN_AGE} />
        {wall.length > 0 && <ThanksWall cards={wall} />}
        <BuiltForSafety />
        <section className={cn("mx-auto max-w-[1280px]", HOME_Y, HOME_X)}>
          <div className="mx-auto max-w-[860px]">
            <SectionHead eyebrow="FAQ" title="Questions people ask first" center />
            <Accordion items={HOME_FAQ} variant="mint" />
            <p className="mt-6 text-center"><Link href="/faq" className="text-[15px] font-bold text-clay">See all questions</Link></p>
          </div>
        </section>
        <FinalCta />
      </main>
      <PublicFooter />
    </>
  );
}
