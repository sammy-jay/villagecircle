import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/dc/icons";

const LEGAL = [
  { href: "/policies/code-of-conduct", label: "Code of conduct" },
  { href: "/policies/family-guidelines", label: "Family guidelines" },
  { href: "/policies/safeguarding", label: "Safeguarding policy" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/help", label: "Help" },
];
const TAGLINE = "Rebuilding the Village. Empowering the Next Generation.";

/** Footer on every public page except the landing. White row on desktop, link list on the phone. */
export function PublicFooter() {
  return (
    <footer>
      <div className="mt-10 border-t border-line bg-card max-lg:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center gap-7 px-14 py-9 text-[14px] text-stone">
          <Image src="/brand/mark.png" alt="" width={40} height={39} />
          <p className="flex-1 leading-[1.45]"><b className="text-ink">The Village Circle.</b> {TAGLINE}</p>
          <nav aria-label="Footer" className="flex items-center gap-6">
            {LEGAL.map((l) => <Link key={l.href} href={l.href} className="hover:text-ink">{l.label}</Link>)}
            <Link href="/help/report" className="inline-flex items-center gap-1.5 font-bold text-clay"><Icon name="flag" size={16} />Report a concern</Link>
          </nav>
        </div>
      </div>
      <nav aria-label="Footer" className="mx-4 mt-2.5 px-1 pb-1.5 pt-[18px] text-[14.5px] font-semibold text-bark lg:hidden">
        {LEGAL.map((l) => <Link key={l.href} href={l.href} className="flex min-h-11 items-center border-t border-line">{l.label}</Link>)}
        <Link href="/help/report" className="flex min-h-11 items-center gap-2 border-t border-line font-extrabold text-clay"><Icon name="flag" size={17} />Report a concern</Link>
        <p className="mt-2.5 text-caption font-medium leading-normal text-stone">The Village Circle. {TAGLINE}</p>
      </nav>
    </footer>
  );
}

const HOME_COLS: [string, [string, string][]][] = [
  ["Village Circle", [["About us", "/about"], ["How it works", "/#how"], ["Library", "/library"], ["Events", "/#events"], ["FAQ", "/faq"]]],
  ["Get help", [["Help centre", "/help"], ["Report a concern", "/help/report"], ["Crisis support", "/crisis"], ["Contact the team", "/help#contact"]]],
  ["For families", [["Family guidelines", "/policies/family-guidelines"], ["For parents and guardians", "/families"], ["Set up as guardian", "/register?role=guardian"], ["Consent and recordings", "/policies/privacy"]]],
  ["Mentors", [["Become a mentor", "/become-a-mentor"], ["The One Hour Challenge", "/become-a-mentor#challenge"], ["Mentor guide", "/help"], ["Safeguarding commitment", "/policies/code-of-conduct"]]],
  ["Legal", [["Code of conduct", "/policies/code-of-conduct"], ["Safeguarding policy", "/policies/safeguarding"], ["Privacy", "/policies/privacy"], ["Terms of use", "/policies/terms"]]],
];

/** The landing page's sand footer with five link columns and the locale note. */
export function HomeFooter() {
  return (
    <footer className="bg-sand">
      <div className="mx-auto max-w-[1280px] px-[18px] pb-7 pt-[30px] lg:px-14 lg:pb-10 lg:pt-14">
        <div className="mb-[22px] flex items-center gap-3.5 lg:mb-[30px]">
          <Image src="/brand/logo.png" alt="The Village Circle" width={58} height={52} />
          <p className="max-w-[360px] text-[14.5px] text-bark">The Village Circle. {TAGLINE}</p>
        </div>
        <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-5 lg:gap-6">
          {HOME_COLS.map(([title, links]) => (
            <div key={title}>
              <h2 className="font-display text-[16px] font-extrabold">{title}</h2>
              <ul className="mt-3 flex flex-col gap-1 lg:gap-2.5">
                {links.map(([l, href]) => <li key={l}><Link href={href} className="flex min-h-[30px] items-center text-[14.5px] text-bark hover:text-ink lg:min-h-0">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-line pt-[22px] text-[13.5px] text-stone lg:mt-[34px] lg:gap-3.5">
          <span className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 font-bold text-ink"><Icon name="globe" size={18} className="text-forest" />English, Nigeria</span>
          <span className="min-w-[200px] flex-1">Made for young people across Nigeria. Times are shown in WAT (UTC+1). More languages are coming.</span>
        </div>
      </div>
    </footer>
  );
}
