import { redirect } from "next/navigation";
import { participantPage } from "@/lib/participant-ctx";
import { homeFor } from "@/lib/participant-home";
import { HomeView } from "./home-views";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

/** D1 Home (N09 Welcome until the first Ask is sent). Dark mode (D1-D2, D1-M3) comes from the theme tokens. */
export default async function Home() {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/home" : r.to);
  const h = await homeFor(r.ctx.userId);
  if (!h) redirect("/login");
  return <HomeView h={h} ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} />;
}
