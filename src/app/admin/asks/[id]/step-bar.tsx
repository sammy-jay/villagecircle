import { cn } from "@/lib/cn";
import { REVIEW_STEPS } from "@/lib/domain/admin-ops";

/** The same six steps as the reviewer playbook (A24), so the names match everywhere. */
export const STEPS = REVIEW_STEPS;

/** A2 / A8 the six review steps. Done steps are forest, the current one clay. A reviewer can tick a step done or undo it. */
export function StepBar({ askId, done, editable, action }: { askId: string; done: string[]; editable: boolean; action: (fd: FormData) => void }) {
  const current = STEPS.find(([l]) => !done.includes(l))?.[0] ?? "F";
  return (
    <ol className="grid grid-cols-3 gap-2 rounded-card border border-line bg-card p-4 lg:grid-cols-6" aria-label="Review steps">
      {STEPS.map(([l, label]) => {
        const isDone = done.includes(l); const isNow = l === current && !isDone;
        const body = (
          <>
            <span className={cn("block h-1.5 rounded-full", isDone ? "bg-forest" : isNow ? "bg-clay" : "bg-sand")} />
            <span className={cn("mt-2 block text-left text-[12.5px] leading-tight", isNow ? "font-extrabold" : "text-bark")}>Step {l}<br />{label}</span>
          </>
        );
        return (
          <li key={l} aria-current={isNow ? "step" : undefined}>
            {editable ? <form action={action}><input type="hidden" name="askId" value={askId} /><input type="hidden" name="step" value={l} /><button type="submit" className="w-full" title={isDone ? "Mark as not done" : "Mark as done"}>{body}<span className="sr-only">{isDone ? ", done. Press to undo." : ". Press to mark done."}</span></button></form> : body}
          </li>
        );
      })}
    </ol>
  );
}
