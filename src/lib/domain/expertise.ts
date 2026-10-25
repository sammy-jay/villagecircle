export const EXPERTISE = [
  ["EXP-HLT", "Healthcare & Medicine"], ["EXP-ENG", "Engineering"], ["EXP-TEC", "Technology & Data"], ["EXP-BUS", "Business & Management"],
  ["EXP-FIN", "Finance & Accounting"], ["EXP-ENT", "Entrepreneurship & Small Business"], ["EXP-LAW", "Law & Justice"], ["EXP-EDU", "Education & Academia"],
  ["EXP-SCI", "Science & Research"], ["EXP-PUB", "Government, Public Service & Nonprofit"], ["EXP-CRE", "Creative Arts, Media & Communications"],
  ["EXP-TRD", "Skilled Trades & Construction"], ["EXP-REA", "Real Estate & Property"], ["EXP-LDR", "Leadership & Community"], ["EXP-OTH", "Other, please specify"],
] as const;
export const EXPERTISE_CODES = EXPERTISE.map(([c]) => c) as unknown as [string, ...string[]];
export const expertiseLabel = (code: string) => EXPERTISE.find(([c]) => c === code)?.[1] ?? code;
