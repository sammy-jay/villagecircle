import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "@fontsource/caveat/600.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CookieBanner } from "@/components/public/cookie-banner";
import { MaintenanceNotice } from "@/components/public/maintenance-notice";
import { Analytics } from "@vercel/analytics/next"

const DESCRIPTION = "Ask the village. A short question about school, work or life, answered by people who have been there.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: { default: "The Village Circle", template: "%s · The Village Circle" },
  description: DESCRIPTION,
  // The card shown when a link is shared on WhatsApp, X, LinkedIn and the rest.
  openGraph: { type: "website", siteName: "The Village Circle", title: "The Village Circle", description: DESCRIPTION, images: [{ url: "/brand/logo.png", alt: "The Village Circle" }] },
  twitter: { card: "summary", title: "The Village Circle", description: DESCRIPTION, images: ["/brand/logo.png"] },
  // The mark on clay, from the brand board. The web manifest (app/manifest.ts) adds the home-screen icons.
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = { themeColor: "#F7F5F0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a href="#main" className="dc-skip">Skip to content</a>
        <MaintenanceNotice />
        <Providers>{children}</Providers>
        <CookieBanner />
        <Analytics/>
      </body>
    </html>
  );
}
