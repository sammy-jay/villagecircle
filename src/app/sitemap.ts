import type { MetadataRoute } from "next";
import { POLICIES } from "@/lib/public-content";

const SITE = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

/** The public pages, for search engines. Library items are left out because they change with the team's reviews. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/about", "/become-a-mentor", "/families", "/library", "/faq", "/help", "/help/report", "/register", "/login"];
  return [
    ...pages.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...POLICIES.map((p) => ({ url: `${SITE}/policies/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
