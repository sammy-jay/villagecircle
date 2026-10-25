import { redirect } from "next/navigation";
import { participantPage } from "@/lib/participant-ctx";
import { homeFor } from "@/lib/participant-home";
import { listTopics } from "@/lib/asks";
import { HomeView } from "@/app/home/home-views";
import { QuickAsk } from "./quick-ask";

export const metadata = { title: "New Ask" };
export const dynamic = "force-dynamic";

/** D2a Quick Ask, shown over Home. `?q=` prefills the question from a starter chip. */
export default async function NewAsk({ searchParams }: { searchParams: { q?: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/asks/new" : r.to);
  const [h, topics] = await Promise.all([homeFor(r.ctx.userId), listTopics()]);
  if (!h) redirect("/login");
  const options = topics.filter((t) => t.active && !t.later).map((t) => ({ value: t.slug, label: t.name }));
  return (
    <HomeView h={h} ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }}
      overlay={<QuickAsk first={r.ctx.first} minor={r.ctx.minor} topics={options} initial={searchParams.q?.slice(0, 600)} />} />
  );
}
