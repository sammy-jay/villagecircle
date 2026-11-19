import { Icon } from "@/components/dc/icons";
import { StepTrail } from "@/components/public/kit";
import { journeyRows, type JourneyInput } from "@/lib/domain/ask-stages";
import { cn } from "@/lib/cn";

/* The Ask's five stages as a trail (lib/domain/ask-stages.ts): Submitted, Under review, Finding your mentor, Ready to schedule, Completed. */

export { whenLong } from "@/lib/domain/ask-stages";

export function Journey({ j }: { j: JourneyInput }) {
  return <StepTrail steps={journeyRows(j)} />;
}

/**
 * The trail behind an "Additional details" button, so the card above it carries the one status line and the trail
 * is there for anyone who wants the dates. `tone="butter"` sits inside the butter Ask card.
 */
export function AskDetails({ j, tone = "card", className }: { j: JourneyInput; tone?: "card" | "butter"; className?: string }) {
  return (
    <details className={cn("group", tone === "card" && "rounded-card border border-line bg-card", className)}>
      <summary className={cn("flex cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden",
        tone === "card" ? "min-h-[56px] px-5 text-[15px] lg:px-6" : "inline-flex h-[50px] rounded-full border-[1.5px] border-current px-4 text-[14px]")}>
        <Icon name="info" size={17} />Additional details
        <Icon name="chevronDown" size={18} className={cn("transition-transform group-open:rotate-180", tone === "card" && "ml-auto")} />
      </summary>
      <div className={tone === "card" ? "border-t border-line px-5 pb-5 pt-4 lg:px-6" : "mt-3 rounded-[20px] bg-card p-4 text-ink"}>
        <Journey j={j} />
      </div>
    </details>
  );
}
