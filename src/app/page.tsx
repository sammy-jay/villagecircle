import { Accordion } from "@/components/public/accordion";
import { HomeFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import {
  BuiltForSafety, Events, FinalCta, ForMentors, ForParents, HOME_X, HomeHero, HowItWorks, LibraryPeek, MeetMentors, Numbers,
  RealAnswers, SectionHead, ThanksWall, TrustStrip, WhatCanYouAsk, WhoItIsFor, type HomeEvent, type HomeResource, type WallCard,
} from "@/components/public/home";
import { MIN_AGE } from "@/lib/domain/age";
import { FAQ } from "@/lib/public-content";
import { publicLibrary, thanksWall, upcomingEvents } from "@/lib/village";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

/** Board samples, shown only outside production when the database has nothing yet. */
const DEV = process.env.NODE_ENV !== "production";
const SAMPLE_EVENTS: HomeEvent[] = [
  { id: "s1", month: "Oct", day: "24", title: "Careers in tech, live", meta: "Sat, 4:00 pm WAT. Tomi A., product designer" },
  { id: "s2", month: "Nov", day: "01", title: "Money for students: ask us anything", meta: "Sun, 5:00 pm WAT. Chioma N., accountant" },
  { id: "s3", month: "Nov", day: "08", title: "Getting into medicine", meta: "Sun, 4:00 pm WAT. Kwame M. and Dr Bisi O." },
];
const SAMPLE_LIBRARY: HomeResource[] = [
  { id: "s1", topic: "School and exams", title: "How do I choose between science and arts?" },
  { id: "s2", topic: "Life after school", title: "What is a gap year, really?" },
  { id: "s3", topic: "Careers", title: "Writing a first CV with no experience" },
  { id: "s4", topic: "Money", title: "Saving when you have almost nothing" },
];
const SAMPLE_THANKS: WallCard[] = [
  { id: "s1", quote: "\"Now I know what to say in my first customer call.\"", who: "Emeka, 22 thanked Tomi A." },
  { id: "s2", quote: "\"Kind and direct. I left with a plan.\"", who: "Kemi, 16 thanked Dr Bisi" },
  { id: "s3", quote: "\"She made scholarship forms feel doable.\"", who: "Funke, 19 thanked Ife B." },
  { id: "s4", quote: "\"I finally know what to do this year. I almost did not ask.\"", who: "Tunde, 17 thanked Sam E." },
];

async function safe<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try { return await f(); } catch (e) { console.error("landing data", e); return fallback; }
}
const orSample = <T,>(rows: T[], sample: T[]) => (rows.length || !DEV ? rows : sample);

const faqA = (q: string) => FAQ.find((f) => f.q === q)?.a ?? "";
const HOME_FAQ = [
  { title: "Is it really free?", body: "Yes. Joining, asking and meeting a mentor cost nothing. Mentors give their hour as a gift." },
  { title: "Who can join?", body: faqA("Who can join?") },
  { title: "Who are the mentors?", body: faqA("Who are the mentors?") },
  { title: "Can a mentor message me or see my school?", body: faqA("Can a mentor contact me directly?") },
  { title: "What happens on a call?", body: "You meet on the platform through an approved link, for 30 or 60 minutes. Calls with under-18s are recorded and a guardian may attend. Afterwards you can say thanks or ask for a follow-up." },
  { title: "What if something goes wrong?", body: "Report a concern from any page. The connection pauses straight away and our safeguarding lead is told. We resolve every report within 48 hours." },
];

/** Main landing (V-Main). */
export default async function Home() {
  const [events, library, thanks] = await Promise.all([
    safe(() => upcomingEvents(null, 3), []),
    safe(() => publicLibrary(), []),
    safe(() => thanksWall(4), []),
  ]);
  return (
    <>
      <PublicHeader home />
      <main id="main" className="overflow-x-clip">
        <HomeHero minAge={MIN_AGE} />
        <TrustStrip />
        <HowItWorks />
        <WhatCanYouAsk />
        <WhoItIsFor minAge={MIN_AGE} />
        <MeetMentors />
        <RealAnswers />
        <ThanksWall cards={orSample(thanks.map((t) => ({ id: t.id, quote: t.quote, who: t.who })), SAMPLE_THANKS)} />
        <Numbers />
        <Events events={orSample(events, SAMPLE_EVENTS)} />
        <LibraryPeek items={orSample(library.slice(0, 4).map((r) => ({ id: r.id, topic: r.topic, title: r.title })), SAMPLE_LIBRARY)} />
        <BuiltForSafety />
        <ForParents />
        <ForMentors />
        <section className={cn("mx-auto max-w-[1280px] py-5 lg:py-[30px]", HOME_X)}>
          <div className="mx-auto max-w-[860px]">
            <SectionHead eyebrow="FAQ" title="Questions people ask first" center />
            <Accordion items={HOME_FAQ} variant="mint" />
          </div>
        </section>
        <FinalCta />
      </main>
      <HomeFooter />
    </>
  );
}
