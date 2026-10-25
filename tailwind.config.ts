import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0", ink: "#1D1914", bark: "#4A4137", stone: "#6E655A", line: "#E4DFD5",
        forest: { DEFAULT: "#1F4D36", dark: "#173B29" }, sage: "#E8F0EA", clay: "#A8472B",
        gold: "#C99A2E", danger: "#8A2417",
      },
      borderRadius: { card: "12px", control: "8px", tag: "6px" },
      fontFamily: { display: ["var(--font-fraunces)", "Georgia", "serif"], sans: ["var(--font-figtree)", "system-ui", "sans-serif"] },
      minHeight: { target: "44px" }, minWidth: { target: "44px" },
    },
  },
  plugins: [],
};
export default config;
