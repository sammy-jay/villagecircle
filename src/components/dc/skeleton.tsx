import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TabBar } from "./nav";
import { ADMIN_TABS, GUARDIAN_TABS, MENTOR_TABS, PARTICIPANT_TABS, type TabBarItem } from "./nav-config";

/* ST3 Loading skeletons: blocks sit where the real cards will land, so nothing jumps when the content arrives. */

export const Bone = ({ className }: { className?: string }) => <span aria-hidden="true" className={cn("dc-shimmer block rounded-[14px]", className)} />;

/**
 * Which phone layout to show while a section loads. Each role gets its own shape and keeps its own tab bar:
 * participant (feed), mentor (inbox), guardian (approvals), admin (team console). "bones" is a neutral layout for pages
 * every role shares, such as notifications.
 */
export type SkeletonTabs = "participant" | "mentor" | "guardian" | "admin" | "bones";
const TABS: Partial<Record<SkeletonTabs, TabBarItem[]>> = { participant: PARTICIPANT_TABS, mentor: MENTOR_TABS, guardian: GUARDIAN_TABS, admin: ADMIN_TABS };

const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("rounded-card border border-line bg-card", className)}>{children}</div>;
const Chips = ({ widths }: { widths: string[] }) => <div className="-mx-5 flex gap-2 overflow-hidden px-5">{widths.map((w, i) => <Bone key={i} className={cn("h-9 flex-none rounded-full", w)} />)}</div>;
const Row = () => <div className="flex items-center gap-3"><Bone className="size-11 flex-none rounded-full" /><div className="flex min-w-0 flex-1 flex-col gap-2"><Bone className="h-4 w-3/4" /><Bone className="h-3 w-1/2" /></div></div>;

/** Participant (D1-M feed): story rings, the "What is on your mind" composer, the Ask card and a feed post. */
function ParticipantBody() {
  return (
    <>
      <div className="-mx-5 flex gap-3 overflow-hidden px-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex flex-none flex-col items-center gap-1.5"><Bone className="size-[62px] rounded-full" /><Bone className="h-2.5 w-12 rounded-full" /></div>)}</div>
      <Card className="flex flex-col gap-3.5 p-4"><div className="flex items-center gap-3"><Bone className="size-11 flex-none rounded-full" /><Bone className="h-[46px] flex-1 rounded-full" /></div><Chips widths={["w-36", "w-28", "w-32"]} /></Card>
      <div className="flex flex-col gap-3 rounded-[28px] bg-butter/70 p-5"><div className="flex justify-between"><Bone className="h-7 w-24 rounded-full" /><Bone className="h-4 w-20" /></div><Bone className="h-7 w-4/5" /><Bone className="h-4 w-3/5" /><div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <Bone key={i} className="h-2 flex-1 rounded" />)}</div><Bone className="mt-1 h-[50px] w-40 rounded-full" /></div>
      <Card className="flex flex-col gap-3 p-4"><Row /><Bone className="h-[140px] rounded-[20px]" /></Card>
    </>
  );
}

/** Mentor (D4-M inbox): title, section pills, the monthly hours ring and Ask cards with a "Step forward" button. */
function MentorBody() {
  return (
    <>
      <Bone className="h-8 w-28" />
      <Chips widths={["w-24", "w-28", "w-24", "w-20"]} />
      <div className="flex items-center gap-4 rounded-card bg-mint/70 p-4"><span aria-hidden="true" className="block size-[62px] flex-none rounded-full border-[7px] border-card/80" /><div className="flex flex-1 flex-col gap-2"><Bone className="h-5 w-32" /><Bone className="h-3.5 w-4/5" /></div></div>
      {[0, 1].map((i) => (
        <Card key={i} className="flex flex-col gap-3 p-4">
          <div className="flex gap-2"><Bone className="h-7 w-24 rounded-full" /><Bone className="h-7 w-20 rounded-full" /></div>
          <Bone className="h-6 w-5/6" /><Bone className="h-4 w-full" /><Bone className="h-4 w-2/3" />
          <div className="flex gap-2.5 pt-1"><Bone className="h-[46px] flex-1 rounded-full" /><Bone className="h-[46px] w-24 rounded-full" /></div>
        </Card>
      ))}
    </>
  );
}

/** Guardian (G1-M): the young person, the approval waiting on them, and the recent calls list. */
function GuardianBody() {
  return (
    <>
      <div className="flex flex-col gap-2"><Bone className="h-3 w-28 rounded-full" /><Bone className="h-8 w-3/4" /></div>
      <Card className="flex items-center gap-3.5 p-4"><Bone className="size-14 flex-none rounded-full" /><div className="flex flex-1 flex-col gap-2"><Bone className="h-5 w-28" /><Bone className="h-3.5 w-40" /></div></Card>
      <div className="flex flex-col gap-3 rounded-[28px] bg-blush/70 p-5"><Bone className="h-7 w-28 rounded-full" /><Bone className="h-6 w-4/5" /><Bone className="h-4 w-3/5" /><div className="flex gap-2.5 pt-1"><Bone className="h-[50px] flex-1 rounded-full" /><Bone className="h-[50px] w-24 rounded-full" /></div></div>
      <Card className="flex flex-col gap-4 p-4">{[0, 1, 2].map((i) => <Row key={i} />)}</Card>
    </>
  );
}

/** Team console (A-series phone): big page title and line, filter pills, the mint health card and a list of records. */
function AdminBody() {
  return (
    <>
      <div className="flex flex-col gap-2"><Bone className="h-8 w-3/4" /><Bone className="h-4 w-full" /><Bone className="h-4 w-2/3" /></div>
      <Chips widths={["w-16", "w-24", "w-24", "w-40"]} />
      <div className="grid grid-cols-2 gap-3">{["bg-mint/70", "bg-butter/70", "bg-blush/70", "bg-mint/70"].map((t, i) => <div key={i} className={cn("flex flex-col gap-2.5 rounded-[22px] p-4", t)}><Bone className="h-3 w-20 rounded-full" /><Bone className="h-7 w-12" /></div>)}</div>
      <Card className="divide-y divide-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-2"><Bone className="h-4 w-4/5" /><div className="flex gap-2"><Bone className="h-6 w-16 rounded-full" /><Bone className="h-6 w-20 rounded-full" /></div></div>
            <Bone className="size-5 flex-none rounded-[6px]" />
          </div>
        ))}
      </Card>
    </>
  );
}

/** Shared pages (notifications): a title and a plain list. */
function SharedBody() {
  return (
    <>
      <Bone className="h-8 w-40" />
      <Chips widths={["w-16", "w-24", "w-24"]} />
      <Card className="flex flex-col gap-5 p-4">{[0, 1, 2, 3, 4].map((i) => <Row key={i} />)}</Card>
    </>
  );
}

/** The phone tab bar as bones, for shared pages where the role is not known yet. */
function TabBones() {
  return (
    <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex h-[66px] max-w-[480px] items-start px-1.5 pt-2.5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex flex-1 flex-col items-center gap-[7px]"><Bone className="size-6 rounded-[8px]" /><Bone className="h-2.5 w-10 rounded-full" /></div>)}
      </div>
    </div>
  );
}

const BODY: Record<SkeletonTabs, () => ReactNode> = { participant: ParticipantBody, mentor: MentorBody, guardian: GuardianBody, admin: AdminBody, bones: SharedBody };

function PhoneSkeleton({ tabs }: { tabs: SkeletonTabs }) {
  const items = TABS[tabs];
  const Body = BODY[tabs];
  return (
    <div className="lg:hidden">
      <div className="flex h-[60px] items-center gap-2 px-4">
        <Image src="/brand/mark.png" alt="" width={38} height={37} />
        <Bone className="ml-2.5 h-6 w-32" />
        <span className="ml-auto flex gap-2"><Bone className="size-10 rounded-full" /><Bone className="size-10 rounded-full" /></span>
      </div>
      {tabs === "admin" && <div className="px-4 pb-1 pt-1"><Bone className="h-10 w-full rounded-full" /></div>}
      <div className="flex flex-col gap-4 px-5 pb-6 pt-2"><Body /></div>
      <div className="h-[66px]" aria-hidden="true" />
      {items ? <TabBar items={items} /> : <TabBones />}
    </div>
  );
}

/**
 * Signed-in dashboard shape. Desktop: top bar, side menu, a colour card, two cards and the right rail.
 * Phone: the role's own layout over its own tab bar, so it never looks like a stacked desktop.
 */
export function DashboardSkeleton({ rail = true, tabs = "bones" }: { rail?: boolean; tabs?: SkeletonTabs }) {
  return (
    <div className="min-h-screen" role="status" aria-label="Loading">
      <PhoneSkeleton tabs={tabs} />
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
