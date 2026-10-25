/** Client-safe copy of REASON_LABEL in review.ts (that module imports the database). */
export const REASON_LABEL: Record<string, string> = Object.fromEntries(["R_NEW", "R_THIN", "R_CONSENT", "R_FLAG", "R_REFER", "R_NOONE", "R_QUIET", "R_MANY", "R_TIME", "R_AGAIN", "R_MISS", "R_CONCERN"].map((k) => [k, k.replace("_", "-")]));
