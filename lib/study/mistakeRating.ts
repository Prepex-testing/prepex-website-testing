/**
 * The review buttons and what each tells the spaced-repetition scheduler.
 * (`remembered: false` is a lapse — the schedule restarts at "tomorrow".)
 */

export type RatingKey = "hard" | "good" | "easy";

export interface Rating {
  key: RatingKey;
  label: string;
  difficulty: number;
  remembered: boolean;
}

export const RATINGS: readonly Rating[] = [
  { key: "hard", label: "Still Hard", difficulty: 5, remembered: false },
  { key: "good", label: "Got It", difficulty: 3, remembered: true },
  { key: "easy", label: "Easy", difficulty: 1, remembered: true },
];

const DAY_MS = 86_400_000;

/** "tomorrow", "in 3 days", "in 2 months", "today" (already due), or "never" for a mastered mistake. */
export function describeNextReview(nextReviewAt: string | null, now: Date = new Date()): string {
  if (!nextReviewAt) return "never — mastered";
  const days = Math.ceil((new Date(nextReviewAt).getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 60) return `in ${days} days`;
  return `in ${Math.round(days / 30)} months`;
}
