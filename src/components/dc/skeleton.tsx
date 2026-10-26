import { cn } from "@/lib/cn";

/* ST3 Loading skeletons: blocks sit where the real cards will land, so nothing jumps when the content arrives. */

export const Bone = ({ className }: { className?: string }) => <span aria-hidden="true" className={cn("dc-shimmer block rounded-[14px]", className)} />;

/** Signed-in dashboard shape (participant, mentor, guardian and team): top bar, side menu, a colour card, two cards and the right rail. */
export function DashboardSkeleton({ rail = true }: { rail?: boolean }) {
  return (
    <div className="min-h-screen" role="status" aria-label="Loading">
      <div className="hidden h-[68px] items-center border-b border-line bg-card lg:flex">
        <div className="w-[262px] px-8"><Bone className="size-11 rounded-full" /></div>
        <div className="flex flex-1 items-center gap-4 px-10"><Bone className="h-11 w-full max-w-[460px] rounded-full" /><span className="ml-auto flex items-center gap-3"><Bone className="size-11 rounded-full" /><Bone className="h-9 w-28" /></span></div>
      </div>
      <div className="flex h-[60px] items-center gap-3 px-4 lg:hidden"><Bone className="size-10 rounded-full" /><Bone className="h-6 w-40" /></div>
      <div className="flex">
        <div className="hidden w-[262px] flex-none flex-col gap-1 border-r border-line bg-card px-3 py-5 lg:flex">{[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} className="h-11" />)}</div>
        <div className="flex min-w-0 flex-1 gap-8 px-5 lg:px-10">
          <div className="flex w-full max-w-[700px] flex-col gap-4 pb-6 pt-2 lg:gap-5 lg:py-8">
            <div className="flex gap-3">{[0, 1, 2, 3, 4].map((i) => <Bone key={i} className="size-[62px] rounded-full" />)}</div>
            <span aria-hidden="true" className="block h-[170px] rounded-[28px] bg-butter/70" />
            <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><div className="flex items-center gap-3"><Bone className="size-11 rounded-full" /><Bone className="h-4 w-40" /></div><Bone className="h-5 w-4/5" /><Bone className="h-4 w-3/5" /><Bone className="h-[120px]" /></div>
            <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><Bone className="h-5 w-2/3" /><Bone className="h-4 w-1/2" /></div>
          </div>
          {rail && <div className="hidden w-[320px] flex-none flex-col gap-5 py-8 lg:flex"><span aria-hidden="true" className="block h-[150px] rounded-card bg-mint/60" /><div className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"><Bone className="h-5 w-1/2" /><Bone className="h-4" /><Bone className="h-4 w-4/5" /></div></div>}
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
