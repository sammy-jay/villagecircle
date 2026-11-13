import Image from "next/image";
import { cn } from "@/lib/cn";
import { TabBar } from "./nav";
import { GUARDIAN_TABS, MENTOR_TABS, PARTICIPANT_TABS, type TabBarItem } from "./nav-config";

/* ST3 Loading skeletons: blocks sit where the real cards will land, so nothing jumps when the content arrives. */

export const Bone = ({ className }: { className?: string }) => <span aria-hidden="true" className={cn("dc-shimmer block rounded-[14px]", className)} />;

/** Which phone tab bar to keep on screen while a section loads. "bones" draws a neutral bar when the role is not known. */
export type SkeletonTabs = "participant" | "mentor" | "guardian" | "bones" | "none";
const TABS: Partial<Record<SkeletonTabs, TabBarItem[]>> = { participant: PARTICIPANT_TABS, mentor: MENTOR_TABS, guardian: GUARDIAN_TABS };

/** The phone tab bar as bones: five slots with the raised middle button, same height as the real bar. */
function TabBones() {
  return (
    <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex h-[86px] max-w-[480px] items-start px-1.5 pt-2.5">
        {[0, 1, 2, 3, 4].map((i) => i === 2
          ? <div key={i} className="-mt-[22px] flex flex-1 justify-center"><span className="block size-[58px] -rotate-[4deg] rounded-[20px] bg-clay/80" /></div>
          : <div key={i} className="flex flex-1 flex-col items-center gap-[7px]"><Bone className="size-6 rounded-[8px]" /><Bone className="h-2.5 w-10 rounded-full" /></div>)}
      </div>
    </div>
  );
}

/** Phone layout: the real header mark, a page title, chips, a colour card and compact rows, over the section's own tab bar. */
function PhoneSkeleton({ tabs, crumb }: { tabs: SkeletonTabs; crumb?: boolean }) {
  const items = TABS[tabs];
  return (
    <div className="lg:hidden">
      <div className="flex h-[60px] items-center gap-2 px-4">
        <Image src="/brand/mark.png" alt="" width={38} height={37} />
        <Bone className="ml-2.5 h-6 w-32" />
        <span className="ml-auto flex gap-2"><Bone className="size-10 rounded-full" /><Bone className="size-10 rounded-full" /></span>
      </div>
      {crumb && <div className="px-4 pb-1 pt-1"><Bone className="h-9 w-56 rounded-full" /></div>}
      <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
        <div className="flex flex-col gap-2"><Bone className="h-3 w-24 rounded-full" /><Bone className="h-8 w-3/4" /></div>
        <div className="-mx-5 flex gap-2 overflow-hidden px-5">{["w-20", "w-28", "w-24", "w-20"].map((w, i) => <Bone key={i} className={cn("h-9 flex-none rounded-full", w)} />)}</div>
        <div className="flex flex-col gap-3 rounded-[28px] bg-butter/70 p-5"><Bone className="h-3 w-28 rounded-full" /><Bone className="h-7 w-4/5" /><Bone className="h-4 w-3/5" /><Bone className="mt-1 h-[50px] w-40 rounded-full" /></div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-card p-4">
            <Bone className="size-12 flex-none rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2"><Bone className="h-4 w-3/4" /><Bone className="h-3 w-1/2" /></div>
          </div>
        ))}
      </div>
      {tabs !== "none" && <div className="h-[86px]" aria-hidden="true" />}
      {items ? <TabBar items={items} /> : tabs === "bones" ? <TabBones /> : null}
    </div>
  );
}

/**
 * Signed-in dashboard shape (participant, mentor, guardian and team). Desktop: top bar, side menu, a colour card, two cards and
 * the right rail. Phone: its own layout, keeping the section's tab bar so the page does not look like a stacked desktop.
 */
export function DashboardSkeleton({ rail = true, tabs = "bones", crumb }: { rail?: boolean; tabs?: SkeletonTabs; crumb?: boolean }) {
  return (
    <div className="min-h-screen" role="status" aria-label="Loading">
      <PhoneSkeleton tabs={tabs} crumb={crumb} />
      <div className="hidden lg:block">
        <div className="flex h-[68px] items-center border-b border-line bg-card">
          <div className="w-[262px] px-8"><Bone className="size-11 rounded-full" /></div>
          <div className="flex flex-1 items-center gap-4 px-10"><Bone className="h-11 w-full max-w-[460px] rounded-full" /><span className="ml-auto flex items-center gap-3"><Bone className="size-11 rounded-full" /><Bone className="h-9 w-28" /></span></div>
        </div>
        <div className="flex">
          <div className="flex w-[262px] flex-none flex-col gap-3 border-r border-line bg-card px-3 py-5">{[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} className="h-11" />)}</div>
          <div className="flex min-w-0 flex-1 gap-8 px-10">
            <div className="flex w-full max-w-[700px] flex-col gap-5 py-8">
              <div className="flex gap-3">{[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="size-[62px] rounded-full" />)}</div>
              <span aria-hidden="true" className="block h-[170px] rounded-[28px] bg-butter/70" />
              <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><div className="flex items-center gap-3"><Bone className="size-11 rounded-full" /><Bone className="h-4 w-40" /></div><Bone className="h-5 w-4/5" /><Bone className="h-4 w-3/5" /><Bone className="h-[120px]" /></div>
              <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><Bone className="h-5 w-2/3" /><Bone className="h-4 w-1/2" /></div>
            </div>
            {rail && <div className="flex w-[320px] flex-none flex-col gap-5 py-8"><span aria-hidden="true" className="block h-[150px] rounded-card bg-mint/60" /><div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><Bone className="h-5 w-1/2" /><Bone className="h-4" /><Bone className="h-4 w-4/5" /></div></div>}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
