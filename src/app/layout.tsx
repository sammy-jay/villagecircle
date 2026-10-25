import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "@fontsource/caveat/600.css";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { CookieBanner } from "@/components/public/cookie-banner";
import { MaintenanceNotice } from "@/components/public/maintenance-notice";

export const metadata: Metadata = {
  title: { default: "The Village Circle", template: "%s · The Village Circle" },
  description: "Ask the village. A short question about school, work or life, answered by people who have been there.",
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
      </body>
    </html>
  );
}
