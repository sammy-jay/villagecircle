import type { IconName } from "@/components/dc/icons";

/* Plain module so server pages (the Ask wizard topic step) and client components can both use it. */

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
