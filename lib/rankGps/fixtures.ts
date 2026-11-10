import type { Locked, RankGpsHomeCard, RankGpsOverview, SnapshotView, Tier } from "@/lib/api/rankGps";
import type { GateState, MockAutopsy, OpportunityChapter, RankGpsReport, TaskKind } from "@/lib/rankGps/types";

/** Realistic Rank GPS payloads for tests and the stubbed-API screenshots. Not shipped to students. */

const gateOpen: GateState = { unlocked: true, daysSinceSignup: 21, activeDays: 14, needDays: 7, needActiveDays: 3 };
export const gateLocked: GateState = { unlocked: false, daysSinceSignup: 4, activeDays: 2, needDays: 7, needActiveDays: 3 };

const chapter = (i: number, over: Partial<OpportunityChapter> = {}): OpportunityChapter => ({
  chapterId: `ch-${i}`,
  subjectId: (i % 3) + 1,
  subjectName: ["Physics", "Chemistry", "Maths"][i % 3]!,
  name: ["Rotational Motion", "Ionic Equilibrium", "Definite Integrals", "Thermodynamics", "Chemical Bonding", "Complex Numbers", "Electrostatics", "Organic Reactions", "Probability", "Optics"][i % 10]!,
  availableMarks: 8 - (i % 4),
  captureNow: 0.3,
  captureTarget: 0.8,
  potential: 6.5 - i * 0.45,
  hours: 4 + (i % 3),
  roi: 1.4 - i * 0.08,
  status: i % 2 === 0 ? "in_progress" : "not_started",
  accuracy: i % 2 === 0 ? 0.42 : null,
  freshness: 0.6,
  mistakesOpen: i % 3,
  action: "Solve 30 questions on this chapter, then revise the mistakes.",
  ...over,
});

const hours = (lecture: number, practice: number, revision: number, backlog = 0, mock = 0): Record<TaskKind, number> => ({ lecture, practice, revision, backlog, mock });

const autopsy = (over: Partial<MockAutopsy> = {}): MockAutopsy => ({
  mockId: "m1",
  name: "AITS 4",
  date: "2026-11-02",
  total: 142,
  max: 300,
  lost: 118,
  attemptedWrong: 14,
  blank: 12,
  reasons: [
    { reason: "silly_calculation", marks: 40, count: 8, topChapter: "Definite Integrals" },
    { reason: "concept_gap", marks: 35, count: 7, topChapter: "Rotational Motion" },
    { reason: "time_pressure", marks: 23, count: 6, topChapter: "Ionic Equilibrium" },
    { reason: "misread", marks: 20, count: 5, topChapter: "Thermodynamics" },
  ],
  fixBiggest: { reason: "silly_calculation", marks: 40, percentileNow: 94.1, percentileLow: 96.2, percentileHigh: 97.9 },
  ...over,
});

export type ReportOptions = {
  track?: "jee" | "neet";
  withMocks?: boolean;
  withAutopsy?: boolean;
  withChange?: boolean;
  withTarget?: boolean;
  heavyMistakes?: boolean;
};

export function makeReport(o: ReportOptions = {}): RankGpsReport {
  const { track = "jee", withMocks = true, withAutopsy = true, withChange = true, withTarget = true, heavyMistakes = false } = o;
  const jee = track === "jee";
  const ready = jee && withMocks;
  const chapters = Array.from({ length: 10 }, (_, i) => chapter(i));
  const aut = withAutopsy ? (heavyMistakes ? autopsy({ total: 96, lost: 160, attemptedWrong: 26, blank: 14, reasons: [{ reason: "concept_gap", marks: 70, count: 14, topChapter: "Rotational Motion" }, { reason: "silly_calculation", marks: 55, count: 11, topChapter: "Definite Integrals" }, { reason: "guessed", marks: 20, count: 4, topChapter: "Probability" }, { reason: "unknown", marks: 15, count: 3, topChapter: null }] }) : autopsy()) : null;
  return {
    version: 1,
    generatedAt: "2026-11-09T12:30:00.000Z",
    track,
    paperMax: jee ? 300 : 720,
    gate: gateOpen,
    readiness: {
      score: 62,
      components: [
        { key: "coverage", weight: 25, value: 58, points: 14.5, hasData: true },
        { key: "retention", weight: 20, value: 64, points: 12.8, hasData: true },
        { key: "accuracy", weight: 25, value: 61, points: 15.3, hasData: true },
        { key: "mocks", weight: 20, value: ready ? 66 : 0, points: ready ? 13.2 : 0, hasData: ready },
        { key: "consistency", weight: 10, value: 72, points: 7.2, hasData: true },
      ],
    },
    projection: ready
      ? {
          status: "ready",
          mocksHave: 3,
          mocksNeed: 2,
          data: { marks: { low: 118, centre: 138, high: 158 }, percentile: { low: 97.5, high: 99.2 }, rank: { best: 7_240, worst: 21_700 }, mocksUsed: 3, trendMarks: 6, spreadMarks: 20 },
        }
      : jee
        ? { status: "needs_mocks", mocksHave: 1, mocksNeed: 2, data: null }
        : { status: "not_available", mocksHave: 0, mocksNeed: 2, data: null },
    target:
      jee && withTarget
        ? {
            targetPercentile: 99,
            requiredMarks: { low: 138, centre: 153, high: 168 },
            gapMarks: ready ? 15 : null,
            subjects: [
              { subject: "physics", gapMarks: 6, averageMarks: 44, requiredMarks: 50 },
              { subject: "chemistry", gapMarks: 4, averageMarks: 48, requiredMarks: 52 },
              { subject: "maths", gapMarks: 5, averageMarks: 46, requiredMarks: 51 },
            ],
          }
        : null,
    opportunity: {
      moves: chapters.slice(0, 3).map((c) => ({ id: `move:${c.chapterId}`, chapterId: c.chapterId, subjectId: c.subjectId, name: c.name, action: c.action, hours: c.hours, marksGain: c.potential, goal: { type: "QUESTIONS" as const, target: 30, unit: "COUNT" as const } })),
      chapters,
      targetCapture: 0.8,
    },
    autopsy: { latest: aut, all: aut ? [aut, autopsy({ mockId: "m0", name: "AITS 3", date: "2026-10-26", total: 126, lost: 130 })] : [], missing: !withAutopsy },
    effort: {
      primary: { key: "shift_to_practice", text: "You spent 71% of your hours on lectures and 14% on practice. Shift two hours a week from lectures to solving questions." },
      secondary: { key: "mock_due", text: "Your last full mock was 9 days ago." },
      weeks: [18, 22, 20, 25, 19, 24, 27, 23].map((total, i) => ({ weekStart: new Date(Date.UTC(2026, 8, 14 + 7 * i)).toISOString().slice(0, 10), hours: hours(total * 0.6, total * 0.2, total * 0.12, total * 0.05, total * 0.03), accuracy: 55 + i, questions: 120 + i * 10 })),
      split: hours(110, 40, 25, 8, 6),
      totalHours28: 189,
      practiceShare: 0.14,
    },
    change: withChange
      ? {
          delta: 2.4,
          components: [
            { key: "accuracy", delta: 1.8 },
            { key: "consistency", delta: 1.1 },
            { key: "retention", delta: -0.5 },
          ],
          positives: [{ chapterId: "ch-0", name: "Rotational Motion", points: 1.2, why: "Accuracy rose to 48% after 40 questions" }],
          negatives: [{ chapterId: "ch-1", name: "Ionic Equilibrium", points: -0.6, why: "Not revised for 16 days" }],
        }
      : null,
    whatIf: ready
      ? { k: 1.05, baseCentre: 138, subjects: [{ subjectId: 1, name: "Physics", modelMarks: 44, accuracy: 0.55, coverage: 0.6 }, { subjectId: 2, name: "Chemistry", modelMarks: 48, accuracy: 0.6, coverage: 0.65 }, { subjectId: 3, name: "Maths", modelMarks: 41, accuracy: 0.5, coverage: 0.55 }] }
      : null,
    chapterMini: {},
  };
}

const freeLocked: Locked = { fullOpportunityMap: true, autopsyTrend: true, whatIf: true, subjectGap: true };
const none: Locked = { fullOpportunityMap: false, autopsyTrend: false, whatIf: false, subjectGap: false };

/** What the server returns for the free tier: premium sections already removed. */
export function stripFree(report: RankGpsReport): RankGpsReport {
  return { ...report, opportunity: { ...report.opportunity, chapters: report.opportunity.chapters.slice(0, 5) }, autopsy: { ...report.autopsy, all: report.autopsy.latest ? [report.autopsy.latest] : [] }, whatIf: null, target: report.target ? { ...report.target, subjects: [] } : null };
}

export function makeSnapshot(tier: Tier, o: ReportOptions & { showProBanner?: boolean; id?: string } = {}): SnapshotView {
  const full = makeReport(o);
  const free = tier === "free";
  return {
    id: o.id ?? `snap-${tier}`,
    createdAt: "2026-11-09T12:30:00.000Z",
    weekStart: "2026-11-09",
    trigger: "weekly",
    tier,
    coachNote: "Your accuracy is climbing, and that is the number that moves rank fastest. Spend this week on Rotational Motion and Ionic Equilibrium, and redo the integration slips from AITS 4 before you take another paper.",
    coachSource: "ai",
    report: free ? stripFree(full) : full,
    locked: free ? freeLocked : none,
    showProBanner: o.showProBanner ?? false,
  };
}

export function makeOverview(over: Partial<RankGpsOverview> & { snapshot?: SnapshotView | null } = {}): RankGpsOverview {
  const snapshot = over.snapshot === undefined ? makeSnapshot("preview") : over.snapshot;
  return {
    gate: gateOpen,
    snapshot,
    preparing: null,
    history: snapshot ? [{ id: snapshot.id, weekStart: snapshot.weekStart, createdAt: snapshot.createdAt, readiness: snapshot.report.readiness.score, change: snapshot.report.change?.delta ?? null, tier: snapshot.tier, trigger: "weekly" }] : [],
    targetPercentile: 99,
    refresh: { limit: 3, used: 0, left: 3, inWindow: true, windowEndsAt: "2026-12-01T00:00:00.000Z", canRefresh: true, reason: null },
    track: snapshot ? snapshot.report.track : null,
    ...over,
  };
}

export const homeCardReady: RankGpsHomeCard = { state: "ready", score: 62, change: 2.4, topMove: { name: "Rotational Motion", action: "Solve 30 questions" }, gate: gateOpen };
