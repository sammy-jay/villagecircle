export const ORIENTATION_MODULES = [
  { id: "why", title: "Why we do this", duration: "4 min" },
  { id: "talking", title: "Talking with young adults", duration: "8 min" },
  { id: "spotting", title: "Spotting a worry", duration: "7 min" },
  { id: "reporting", title: "What to do if something feels wrong", duration: "6 min" },
] as const;

export type OrientationModuleId = (typeof ORIENTATION_MODULES)[number]["id"];

export function isOrientationModuleId(value: string): value is OrientationModuleId {
  return ORIENTATION_MODULES.some((module) => module.id === value);
}

export function allOrientationModulesComplete(completed: readonly string[]): boolean {
  return ORIENTATION_MODULES.every((module) => completed.includes(module.id));
}
