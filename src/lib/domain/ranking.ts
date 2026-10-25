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

export function scoreMentor(i: RankInput): number {
  const capacity = i.monthlyHours > 0 ? clamp(i.hoursRemaining / i.monthlyHours) : 0;
  const spread = 1 - clamp(i.maxAsksThisMonth > 0 ? i.asksThisMonth / i.maxAsksThisMonth : 0);
  return Math.round(
    (clamp(i.fit) * WEIGHTS.fit + capacity * WEIGHTS.capacity + spread * WEIGHTS.spread +
      clamp(i.affinity) * WEIGHTS.affinity + clamp(i.responsiveness) * WEIGHTS.responsiveness) * 10,
  ) / 10;
}

export function rankMentors(inputs: RankInput[], limit = 6) {
  return inputs.map((i) => ({ mentorId: i.mentorId, score: scoreMentor(i) }))
    .sort((a, b) => b.score - a.score || a.mentorId.localeCompare(b.mentorId))
    .slice(0, limit).map((r, idx) => ({ ...r, rank: idx + 1 }));
}
