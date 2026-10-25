import type { Config } from "tailwindcss";

/** Colours come from CSS variables in globals.css (RGB channels) so the dark theme is a variable swap. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["variant", '&:is([data-theme="dark"] *)'],
  theme: {
    extend: {
      colors: {
        // DSF §1 Colour
        paper: v("paper"), card: v("card"), sand: v("sand"), line: v("line"),
        ink: v("ink"), bark: v("bark"), stone: v("stone"),
        clay: { DEFAULT: v("clay"), ink: v("on-clay") },
        forest: { DEFAULT: v("forest"), ink: v("on-forest") },
        gold: v("gold"),
        mint: { DEFAULT: v("mint"), ink: v("mint-ink") },
        butter: { DEFAULT: v("butter"), ink: v("butter-ink") },
        blush: { DEFAULT: v("blush"), ink: v("blush-ink") },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Figtree Variable"', "Figtree", "system-ui", "sans-serif"],
        hand: ["Caveat", "cursive"], // legal-name signatures (DK5, M7)
      },
      // DSF §2 Type scale: [size, { lineHeight, letterSpacing }]
      fontSize: {
        display: ["84px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        h1: ["44px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        h2: ["28px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        moment: ["24px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h3: ["21px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        body: ["17px", { lineHeight: "1.5" }],
        field: ["16px", { lineHeight: "1.5" }],
        btn: ["15.5px", { lineHeight: "1.2" }],
        support: ["14.5px", { lineHeight: "1.5" }],
        chip: ["13.5px", { lineHeight: "1.2" }],
        label: ["13px", { lineHeight: "1.2" }],
        caption: ["12.5px", { lineHeight: "1.2" }],
        eyebrow: ["12px", { lineHeight: "1.2", letterSpacing: "0.05em" }],
      },
      borderRadius: { panel: "28px", card: "24px", menu: "18px", field: "16px", saymore: "14px", tile: "12px", check: "8px" },
      boxShadow: {
        menu: "0 12px 30px 0 rgb(0 0 0 / 0.10)",
        toast: "0 10px 28px 0 rgb(29 25 20 / 0.12)",
        raised: "0 8px 20px 0 rgb(168 71 43 / 0.35)",
      },
      minHeight: { target: "44px" }, minWidth: { target: "44px" },
    },
  },
  plugins: [],
};
export default config;
