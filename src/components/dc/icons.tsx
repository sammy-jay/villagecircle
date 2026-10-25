import type { SVGProps } from "react";

/**
 * The boards' icon set: 24px grid, 2px stroke, round caps and joins, currentColor.
 * Paths are copied from the design canvas boards; a few app-only glyphs (marked) are drawn in the same style.
 */
const paths = {
  check: "M5 12l4 4 10-10",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  alert: "M12 3l10 18H2L12 3zM12 10v5M12 18h.01",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronDown: "M6 9l6 6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.5-4.5",
  send: "M21 3L3 11l7 3 3 7 8-18z",
  refresh: "M20 11a8 8 0 10-2 6M20 5v6h-6",
  download: "M12 3v12M7 10l5 5 5-5M4 20h16",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16", // app-only
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  compass: "M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5 5-2z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  pin: "M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  message: "M4 5h16v11H9l-5 4V5z",
  mail: "M3 6h18v12H3V6zM3 7l9 7 9-7",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2",
  video: "M3 7h12v10H3V7zM15 11l6-3v8l-6-3",
  play: "M8 5l11 7-11 7V5z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 6.5M18 14a6 6 0 013.5 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  shieldCheck: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  lock: "M6 11h12v9H6v-9zM8 11V8a4 4 0 018 0v3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  flag: "M5 21V4h12l-2 4 2 4H5",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z",
  bookmark: "M6 3h12v18l-6-4-6 4V3z",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13",
  doc: "M6 3h9l4 4v14H6V3zM15 3v4h4",
  clipboard: "M5 3h14v18H5V3zM9 8h6M9 12h6M9 16h3",
  pencil: "M4 20l1-4L16 5l3 3L8 19l-4 1z",
  signature: "M3 20h18M5 16c3-8 5-9 6-6s2 3 4-2l3 3",
  smile: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 14a5 5 0 008 0M9 9h.01M15 9h.01",
  coin: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4",
  briefcase: "M3 8h18v12H3V8zM9 8V5h6v3M3 13h18",
  graduation: "M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5",
  rocket: "M12 3c4 2 6 6 5 11l-3 3H10l-3-3c-1-5 1-9 5-11zM9 18l-2 3M15 18l2 3M12 10a1.5 1.5 0 100 .01",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  sparkle: "M12 3l2.2 6.3L21 12l-6.8 2.7L12 21l-2.2-6.3L3 12l6.8-2.7L12 3z",
  // App-only glyphs, same style, until their boards are built.
  calendar: "M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  pause: "M10 6v12M14 6v12",
  inbox: "M4 13l2-8h12l2 8v6H4v-6zM4 13h5l1 2h4l1-2h5",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  grid: "M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7zM13 13h7v7h-7v-7z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM16 12a4 4 0 11-8 0 4 4 0 018 0zM12 12h.01",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  bell: "M6 10a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0",
  edit: "M4 20l1-4L16 5l3 3L8 19l-4 1z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  wifiOff: "M2 2l20 20M8.5 16.5a5 5 0 017 0M5 13a10 10 0 015-2.7M12 20h.01M19 13a10 10 0 00-2.3-1.6M2 8.8a15 15 0 014.2-2.6M22 8.8A15 15 0 0010.7 5",
} as const;

export type IconName = keyof typeof paths;

/** `filled` fills the shape with currentColor (the boards' "Helpful" heart and play button). */
export function Icon({ name, size = 20, strokeWidth = 2, filled, ...rest }: { name: IconName; size?: number; strokeWidth?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flex: `0 0 ${size}px` }} {...rest}>
      <path d={paths[name]} />
    </svg>
  );
}
