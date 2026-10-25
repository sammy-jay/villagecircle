import Image from "next/image";
import { Icon } from "@/components/dc/icons";
import { InfoRows } from "@/components/public/kit";
import { maintenanceCopy } from "@/lib/maintenance";

export const metadata = { title: "Briefly offline" };
export const dynamic = "force-dynamic";

/** "Saturday 24 October, 2:00 to 4:00 am" -> ["2:00 am", "4:00 am"]. */
function ends(window: string): [string, string] | null {
  const m = window.match(/(\d{1,2}:\d{2})\s*(am|pm)?\s*(?:to|-|–)\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
  return m ? [`${m[1]} ${(m[2] ?? m[4])!.toLowerCase()}`, `${m[3]} ${m[4]!.toLowerCase()}`] : null;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** HP7 Maintenance. Middleware serves this with a 503 while MAINTENANCE_MODE is on. */
export default function Maintenance() {
  const c = maintenanceCopy();
  const e = ends(c.window);
  return (
    <>
      <div className="flex items-start gap-2.5 bg-butter px-[18px] py-3 text-[13.5px] leading-[1.4] text-butter-ink lg:h-12 lg:items-center lg:justify-center lg:py-0 lg:text-[15px]" role="status">
        <Icon name="alert" size={18} className="lg:hidden" /><Icon name="alert" size={19} className="max-lg:hidden" />
        <span><b>Planned maintenance:</b> {c.window}. You will not be able to sign in for {c.length}.</span>
      </div>
      <main id="main" className="px-4 pb-[18px]">
        <div className="flex justify-center pt-8 lg:pt-[26px]">
          <Image src="/brand/mark.png" alt="The Village Circle" width={64} height={62} className="lg:hidden" priority />
          <Image src="/brand/logo.png" alt="The Village Circle" width={71} height={64} className="max-lg:hidden" priority />
        </div>
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-[18px] pt-[18px] text-center lg:pb-10 lg:pt-[70px]">
          <span className="flex size-24 -rotate-6 items-center justify-center rounded-[32px] bg-butter text-butter-ink max-lg:hidden"><Icon name="refresh" size={50} /></span>
          <h1 className="font-display text-[38px] font-extrabold leading-[1.12] tracking-[-.02em] lg:text-[54px] lg:tracking-[-.025em]">We are making things better</h1>
          <p className="max-w-[640px] text-[16px] leading-normal text-bark lg:text-[18.5px]">The Village Circle is briefly offline for maintenance. Booked conversations are not affected. If you have one during this time, we will tell you and help you reschedule.</p>
          <div className="dc-card w-full p-[18px] text-left lg:mt-2 lg:p-[22px]">
            <div className="mb-2 flex justify-between gap-2 text-[12.5px] font-bold text-stone lg:text-[13.5px]">
              <span>{e?.[0]}</span><span>{cap(c.length)} offline</span><span>{e?.[1]}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-xl bg-butter"><div className="h-full w-full rounded-xl bg-gold" /></div>
          </div>
          <InfoRows className="w-full text-left" rows={[
            { icon: "clock", tone: "butter", title: "Back by", sub: c.backBy },
            { icon: "clipboard", tone: "mint", title: "Your drafts", sub: "Saved. Nothing is lost" },
            { icon: "shieldCheck", tone: "blush", title: "Urgent safeguarding", sub: "Email or SMS the safeguarding lead" },
          ]} />
        </div>
      </main>
    </>
  );
}
