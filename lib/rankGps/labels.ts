import type { ComponentKey, ReasonKey } from "@/lib/rankGps/types";

/** Every user-facing name and sentence of Rank GPS, in one place so the feature can be renamed. */
export const RANK_GPS_NAME = "Rank GPS";
export const RANK_GPS_HREF = "/analytics/rank-gps";

export const COPY = {
  name: RANK_GPS_NAME,
  tagline: "Where you stand, and the moves that gain you the most marks.",
  estimate: "Estimate",
  preparing: "Preparing your report…",
  preparingSub: "This usually takes a few seconds. We will tell you when it is ready.",
  slow: "This is taking longer than usual. We will notify you as soon as your report is ready.",
  failed: "We could not build your report. Please try again in a little while.",
  waitingFirst: "Your first report is ready to be built.",
  waitingFirstSub: "It also arrives on its own every Sunday evening.",
  getFirst: "Get my first report",
  needsMocks: "Log 2 full mocks to unlock your projected percentile",
  neetNoPercentile: "Percentile and rank are not available for NEET yet. Your readiness score and your route work the same way.",
  needsAutopsy: "Log mistakes from your latest mock to unlock Autopsy",
  needsTarget: "Pick a target percentile to see your route",
  how: "How is this calculated?",
  whyMoved: "Why it moved",
  route: "Your route",
  routeSub: "The three moves that gain you the most marks this week.",
  map: "Marks Opportunity Map",
  mapSub: "Every square is a chapter. Bigger means more marks you can still win.",
  autopsy: "Mock Autopsy",
  effort: "Effort Check",
  coach: "Coach note",
  whatIf: "What-If simulator",
  whatIfSub: "Move the sliders to see what the same marks would do to your projection.",
  addToWeek: "Add to this week",
  added: "Added to this week",
  alreadyThere: "Already in your goals this week",
  refresh: "Refresh my GPS",
  pastReports: "Past reports",
  proLocked: "Part of Prepex Pro. Coming soon.",
  proBanner: "Full reports are coming with Prepex Pro. Your first report was a free preview.",
  previewBadge: "Free preview of the full report",
  share: "Share",
  shareTitle: "Share your Rank GPS",
  shareNote: "The image is made on your phone. Nothing is uploaded.",
  lockedTitle: "Your Rank GPS unlocks soon",
  lockedSub: "It needs a week of real study to be honest with you.",
} as const;

export const COMPONENT_LABELS: Record<ComponentKey, { label: string; hint: string }> = {
  coverage: { label: "Coverage", hint: "How much of the syllabus you have covered, weighted by how many marks each chapter carries." },
  retention: { label: "Retention", hint: "How fresh your revision is, compared with when each chapter is due again." },
  accuracy: { label: "Accuracy", hint: "How often you get practice questions right, over the last 30 days." },
  mocks: { label: "Mocks", hint: "How you score in full mock tests, with the latest ones counting most." },
  consistency: { label: "Consistency", hint: "How steadily you have studied and finished your plan over the last 4 weeks." },
};

export const REASON_LABELS: Record<ReasonKey, string> = {
  concept_gap: "Concept gap",
  silly_calculation: "Silly calculation",
  misread: "Misread the question",
  formula_forgot: "Forgot the formula",
  didnt_know_how_to_start: "Could not start",
  time_pressure: "Time pressure",
  guessed: "Guessed",
  unknown: "No reason noted",
};

export const TASK_KIND_LABELS = { lecture: "Lectures", practice: "Practice", revision: "Revision", backlog: "Backlog", mock: "Mocks" } as const;

/** The four premium sections, by the key the server uses. */
export const PREMIUM_LABELS = { fullOpportunityMap: "Full Opportunity Map", autopsyTrend: "Autopsy trend and per-subject marks lost", whatIf: "What-If simulator", subjectGap: "Subject-level gap" } as const;

export const HOW_STEPS = [
  { title: "Readiness score", body: "Five parts add up to 100: coverage 25, retention 20, accuracy 25, mocks 20 and consistency 10. If you have no mock yet, the mock share is spread across the other four." },
  { title: "Projected percentile", body: "Needs 2 or more full mocks. The centre follows your last three mocks (the latest counts most) plus a capped trend. The range is wider when your scores swing more, and never narrower than 15 marks. It is a range, not a promise." },
  { title: "Percentile and rank", body: "We turn marks into a JEE Main percentile with a table of past marks-to-percentile points and straight lines between them, then into an approximate rank. Real papers vary by shift, so treat both as estimates." },
  { title: "Your route", body: "Each chapter has marks still on the table. We rank chapters by marks gained per hour of work, and the top three become your moves for the week." },
  { title: "Marks lost", body: "A wrong answer costs 5 marks (4 you missed plus 1 negative). A blank costs 4." },
] as const;
