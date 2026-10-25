"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

/* Shared pieces of the Ask wizard (D2a, D2, D10 to D12). */

/** Icon and one-line blurb per topic slug. Unknown topics fall back by keyword, then to a chat bubble. */
const LOOKS: [RegExp, IconName, string][] = [
  [/school|exam|college|universit|jamb/, "graduation", "Subjects, applications, study habits"],
  [/career|industry|shadow/, "briefcase", "Choosing a path, first job"],
  [/money|scholar|financ/, "coin", "Saving, scholarships, side income"],
  [/entrepreneur|start|business/, "rocket", "Ideas, business, projects"],
  [/wellbeing|stress|health/, "heart", "Stress, confidence, balance"],
  [/life|after|leader/, "users", "Moving, work, independence"],
  [/resume|cv|r[eé]sum/, "doc", "A CV that gets read"],
  [/interview/, "message", "Practice and what to expect"],
  [/intern/, "briefcase", "Finding and making the most of one"],
  [/network|introduc/, "users", "Meeting people in your field"],
];
export function topicLook(slug: string, name = ""): { icon: IconName; blurb: string } {
  const key = `${slug} ${name}`.toLowerCase();
  const hit = LOOKS.find(([re]) => re.test(key));
  return hit ? { icon: hit[1], blurb: hit[2] } : { icon: "message", blurb: "Ask the team to find the right fit" };
}

export const ASK_STEPS = ["1. Topic", "2. Tell us", "3. Read first", "4. Send"];
/** 8px progress bars with labels. Steps up to `current` are filled. */
export function WizardSteps({ current }: { current: number }) {
  return (
    <ol className="flex gap-2.5" aria-label="Steps">
      {ASK_STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-[7px]" aria-current={i === current ? "step" : undefined}>
          <span className={cn("h-2 rounded", i <= current ? "bg-forest" : "bg-sand")} />
          <span className={cn("text-[12px] lg:text-[13px]", i === current ? "font-extrabold text-ink" : "font-semibold text-stone")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Single-choice chips (forest when chosen) that post as one hidden field. */
export function ChipRadio({ name, options, defaultValue, size = "md", onChange }: { name: string; options: { value: string; label: string }[]; defaultValue?: string; size?: "md" | "lg"; onChange?: (v: string) => void }) {
  const [v, setV] = useState(defaultValue ?? options[0]?.value ?? "");
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={v} />
      {options.map((o) => {
        const on = o.value === v;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => { setV(o.value); onChange?.(o.value); }}
            className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[13px] py-[7px] font-semibold", size === "lg" ? "text-[14.5px]" : "text-[13.5px]", on ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>
            {on && size === "md" && <Icon name="check" size={16} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

export const LENGTHS = [{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }];
export const LENGTHS_SHORT = [{ value: "30", label: "30 min" }, { value: "60", label: "60 min" }];
export const SOON_OPTIONS = [
  { value: "week", label: "Within a week" }, { value: "month", label: "Within a month" }, { value: "term", label: "This term" }, { value: "flexible", label: "No rush" },
];
