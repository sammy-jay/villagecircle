import type { MetadataRoute } from "next";

const SITE = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

/** Search engines may read the public site only. Signed-in pages, the team console and the API stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/mentor/", "/guardian", "/asks", "/home", "/me", "/settings", "/notifications", "/village", "/goals", "/search", "/onboarding", "/after-login", "/mfa", "/call", "/api", "/styleguide"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
