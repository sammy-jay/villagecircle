import type { MetadataRoute } from "next";

/** The web manifest: what a phone shows when the site is added to the home screen. Icons are the mark on clay. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Village Circle",
    short_name: "Village Circle",
    description: "Ask the village. A short question about school, work or life, answered by people who have been there.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#A8472B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
