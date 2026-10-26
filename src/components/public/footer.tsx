import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

const TAGLINE = "Rebuilding the Village. Empowering the Next Generation.";

const COLS: [string, [string, string][]][] = [
  ["Village Circle", [["About us", "/about"], ["How it works", "/#how"], ["Library", "/library"], ["FAQ", "/faq"]]],
  ["Get help", [["Help centre", "/help"], ["Report a concern", "/help/report"], ["Crisis support", "/crisis"], ["Contact the team", "/help#contact"]]],
  ["For families", [["Family guidelines", "/policies/family-guidelines"], ["For parents and guardians", "/families"], ["Set up as guardian", "/register?role=guardian"], ["Consent and recordings", "/policies/privacy"]]],
  ["Mentors", [["Become a mentor", "/become-a-mentor"], ["The One Hour Challenge", "/become-a-mentor#challenge"], ["Mentor guide", "/help"], ["Safeguarding commitment", "/policies/code-of-conduct"]]],
  ["Legal", [["Code of conduct", "/policies/code-of-conduct"], ["Safeguarding policy", "/policies/safeguarding"], ["Privacy", "/policies/privacy"], ["Terms of use", "/policies/terms"]]],
];

/** The one footer for every public page, the landing included: sand, five link columns and the locale note. */
export function PublicFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-10 bg-sand", className)}>
      <div className="mx-auto max-w-[1280px] px-[18px] pb-7 pt-[30px] lg:px-14 lg:pb-10 lg:pt-14">
        <div className="mb-[22px] flex items-center gap-3.5 lg:mb-[30px]">
          <Image src="/brand/logo.png" alt="The Village Circle" width={58} height={52} />
          <p className="max-w-[360px] text-[14.5px] text-bark">The Village Circle. {TAGLINE}</p>
        </div>
        <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-5 lg:gap-6">
          {COLS.map(([title, links]) => (
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
