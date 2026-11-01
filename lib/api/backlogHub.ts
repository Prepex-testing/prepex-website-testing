import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** The Backlog log's hub, fast intake, target dates, and Welcome Back. core-service /api/backlog-items/* and /api/welcome-back. */

type Envelope<T> = { success: true; data: T };
const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api${path}`, options).then((r) => r.data);
const send = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body ?? {}) });

export type Lane = "must" | "smart" | "later";
export const LANE_LABEL: Record<Lane, string> = { must: "Must recover", smart: "Smart path", later: "Later" };
export type Parts = { lectures: number; dpps: number; questions: number; tests: number };

export type HubItem = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  name: string;
  subject: string | null;
  lane: Lane;
  laneReason: string;
  laneManual: boolean;
  parts: Parts;
  /** Minutes left in the lane. */
  minutes: number;
  fullMinutes: number;
  progressPercent: number;
  deadline: string | null;
  isPrerequisite: boolean;
  weightage: 1 | 2 | 3;
  addedOn: string;
};

export type Fix =
  | { kind: "move_date"; date: string }
  | { kind: "smart_path"; itemIds: string[]; hoursSaved: number; feasibleAfter: boolean }
  | { kind: "park"; itemIds: string[]; hoursFreed: number; feasibleAfter: boolean };

export type Feasibility = { requiredMinutes: number; availableMinutes: number; meter: "green" | "amber" | "red"; feasible: boolean; fixes: Fix[] };

export type Pace = { source: "own" | "default"; questionMin: number; lectureMin: number; dppMin: number; testMin: number };

export type BacklogHub = {
  today: string;
  daysToExam: number;
  pace: Pace;
  totalMinutes: number;
  parkedMinutes: number;
  lanes: Record<Lane, { count: number; minutes: number }>;
  items: HubItem[];
  target: { date: string | null; feasibility: Feasibility | null };
  /** Only present when the student set a target date. */
  projectedClearDate: string | null;
  burndown: { date: string; minutes: number }[];
  weekly: { weekStart: string; addedMinutes: number; clearedMinutes: number; added: number; cleared: number }[];
  grewThisWeek: boolean;
  todayQuotaMinutes: number;
};

export const getBacklogHub = () => core<BacklogHub>("/backlog-items/hub");

export type IntakeInput = { subjectId: number; chapterId: string; lectures: number; dpps: number; questions: number; tests: number; targetDate?: string | null };
export type IntakeResult = { itemId: string; lane: Lane; reason: string; fullMinutes: number; laneMinutes: number; pace: Pace; merged: boolean };
export const intakeBacklog = (input: IntakeInput) => core<IntakeResult>("/backlog-items/intake", send("POST", input));

export const setBacklogTarget = (date: string | null) => core<{ date: string | null }>("/backlog-items/target", send("PUT", { date }));
export const getFeasibility = (date: string) => core<Feasibility>(`/backlog-items/feasibility?date=${encodeURIComponent(date)}`);
export const applyBacklogFix = (fix: Fix) => core<unknown>("/backlog-items/fix", send("POST", fix));
export const setBacklogLane = (id: string, lane: Lane | null) => core<{ lane: Lane; reason: string }>(`/backlog-items/${id}/lane`, send("POST", { lane }));
export const backlogFromGoal = (goalId: string) => core<{ itemId: string; alreadyThere: boolean }>("/backlog-items/from-goal", send("POST", { goalId }));

// ---- Welcome Back ----
export type WelcomeBackState = { show: boolean; inactiveDays: number; lastActiveOn: string | null; chapterIds: string[] };
export type WelcomeBackInput = { chapterIds: string[]; backlog: { subjectId: number; chapterId: string; lectures: number; dpps: number; questions: number; tests: number }[] };
export const getWelcomeBack = () => core<WelcomeBackState>("/welcome-back");
export const completeWelcomeBack = (input: WelcomeBackInput) => core<{ chaptersUpdated: number; backlogAdded: number; planned: boolean }>("/welcome-back/complete", send("POST", input));
export const dismissWelcomeBack = () => core<{ dismissed: true }>("/welcome-back/dismiss", send("POST", {}));

/** "3h 20m" / "45m". */
export function hm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** The same maths as the server's estimate, so the form can show the hours before it saves. */
export function estimateMinutes(parts: Parts, pace: Pace): number {
  return Math.max(0, Math.round((parts.lectures * pace.lectureMin + parts.dpps * pace.dppMin + parts.questions * pace.questionMin + parts.tests * pace.testMin) / 5) * 5);
}
