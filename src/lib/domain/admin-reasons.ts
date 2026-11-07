/** Reason codes the reviewer picks on A1 and A6. The applicant gets the plain words, never the code. Codes are counted in reports. */
export const DECLINE_REASONS: [string, string][] = [
  ["D-01", "Not enough detail to assess the application"],
  ["D-02", "Experience is not yet a fit for mentoring young adults"],
  ["D-03", "Area of expertise not matched to a current need"],
  ["D-04", "We could not confirm the details given"],
  ["D-05", "Safeguarding: we cannot proceed"],
];
export const INFO_REASONS: [string, string][] = [
  ["I-01", "Tell us more about your experience with young adults"],
  ["I-02", "Tell us more about your area of expertise"],
  ["I-03", "Confirm a detail on your application"],
];
export const GUARDIAN_FLAG_REASONS: [string, string][] = [
  ["G-01", "Relationship does not look consistent"],
  ["G-02", "Could not reach the guardian on the spot check"],
  ["G-03", "Second-factor check needs repeating"],
];
export const reasonText = (code: string) => [...DECLINE_REASONS, ...INFO_REASONS, ...GUARDIAN_FLAG_REASONS].find(([c]) => c === code)?.[1] ?? "";

/** The applicant-facing message: the plain reason, then the reviewer's note if any. */
export const decisionMessage = (code: string, note: string) => [reasonText(code), note.trim()].filter(Boolean).join(". ");
