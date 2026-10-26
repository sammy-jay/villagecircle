import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

const TAGLINE = "Rebuilding the Village. Empowering the Next Generation.";

const COLS: [string, [string, string][]][] = [
  ["Explore", [["About us", "/about"], ["How it works", "/#how"], ["Library", "/library"], ["FAQ", "/faq"]]],
  ["Get involved", [["Join free", "/register"], ["Become a mentor", "/become-a-mentor"], ["For families", "/families"]]],
  ["Help", [["Help centre", "/help"], ["Crisis support", "/crisis"], ["Contact the team", "/help#contact"]]],
];
const LEGAL: [string, string][] = [["Privacy", "/policies/privacy"], ["Terms", "/policies/terms"], ["Code of conduct", "/policies/code-of-conduct"], ["Safeguarding", "/policies/safeguarding"], ["Family guidelines", "/policies/family-guidelines"]];

/** The one footer for every public page, the landing included: brand and three short columns, then one quiet line of policies. */
export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("bg-sand", className)}>
      <div className="mx-auto max-w-[1280px] px-[18px] pb-8 pt-10 lg:px-14 lg:pb-10 lg:pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex max-w-[340px] flex-col items-start gap-4">
            <Image src="/brand/logo.png" alt="The Village Circle" width={58} height={52} />
            <p className="text-[15px] leading-relaxed text-bark">{TAGLINE}</p>
            <Link href="/help/report" className="inline-flex items-center gap-2 text-[14.5px] font-bold text-clay"><Icon name="flag" size={16} />Report a concern</Link>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:gap-x-20">
            {COLS.map(([title, links]) => (
              <div key={title}>
                <h2 className="font-display text-[16px] font-extrabold">{title}</h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {links.map(([l, href]) => <li key={l}><Link href={href} className="text-[14.5px] text-bark hover:text-ink">{l}</Link></li>)}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[13px] text-stone lg:mt-14 lg:flex-row lg:items-center lg:justify-between">
          <p>The Village Circle · Times shown in WAT (UTC+1)</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map(([l, href]) => <li key={l}><Link href={href} className="hover:text-ink">{l}</Link></li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
}
