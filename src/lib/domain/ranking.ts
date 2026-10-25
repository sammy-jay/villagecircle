/** BRD §6.4 shortlist ranking — a reviewer aid, not an assignment. Weights sum to 100. */
export const WEIGHTS = { fit: 35, capacity: 20, spread: 20, affinity: 15, responsiveness: 10 } as const;

export interface RankInput {
  mentorId: string;
  fit: number; // 0..1 expertise match
  hoursRemaining: number; monthlyHours: number;
  asksThisMonth: number; maxAsksThisMonth: number; // load spread
  affinity: number; // 0..1 language / cohort / shared background
  responsiveness: number; // 0..1 — never lowered by passing (BR-12)
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export type Weights = { fit: number; capacity: number; spread: number; affinity: number; responsiveness: number };

/** `w` comes from Configuration (A5); without it the BRD defaults apply. */
export function scoreMentor(i: RankInput, w: Weights = WEIGHTS): number {
  const capacity = i.monthlyHours > 0 ? clamp(i.hoursRemaining / i.monthlyHours) : 0;
  const spread = 1 - clamp(i.maxAsksThisMonth > 0 ? i.asksThisMonth / i.maxAsksThisMonth : 0);
  return Math.round(
    (clamp(i.fit) * w.fit + capacity * w.capacity + spread * w.spread +
      clamp(i.affinity) * w.affinity + clamp(i.responsiveness) * w.responsiveness) * 10,
  ) / 10;
}

export function rankMentors(inputs: RankInput[], limit = 6, w: Weights = WEIGHTS) {
  return inputs.map((i) => ({ mentorId: i.mentorId, score: scoreMentor(i, w) }))
    .sort((a, b) => b.score - a.score || a.mentorId.localeCompare(b.mentorId))
    .slice(0, limit).map((r, idx) => ({ ...r, rank: idx + 1 }));
}
