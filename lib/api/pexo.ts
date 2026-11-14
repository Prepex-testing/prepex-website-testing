import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { apiRequest } from "@/lib/api/http";
import type { PexoLanguage } from "@/lib/pexo/engine";

/** Pexo, the Prepex companion. core-service /api/pexo. State normally arrives with the XP summary; nothing is polled. */

type Envelope<T> = { success: true; data: T };
const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api/pexo${path}`, options).then((r) => r.data);

export type PexoAccessoryName = "cap" | "scarf" | "headphones";
export type PexoCohort = "flag_off" | "override_on" | "override_off" | "existing" | "pilot_on" | "pilot_off";

export type PexoState = {
  enabled: boolean;
  cohort: PexoCohort;
  libraryVersion: number;
  language: PexoLanguage;
  bubbles: "normal" | "quiet";
  notifications: boolean;
  accessories: PexoAccessoryName[];
  /** Line id -> IST date last shown. */
  shown: Record<string, string>;
  firstVisits: string[];
  marks: Record<string, string>;
  /** Today's IST date on the server. */
  today: string;
  /** Whole days since the student signed up (the tour is for the first week). */
  daysSinceSignup?: number;
  /** Home: which line family Pexo opens with, the facts to fill it, and line ids that would be untrue right now. */
  home?: PexoHomeBubble | null;
  /** "Your Prepex map". */
  quests?: PexoQuests | null;
  /** Today's one smart nudge, if any. */
  nudge?: PexoNudge | null;
  care?: PexoCare;
  /** The Sunday pledge: this week's, and last week's once settled. */
  pledge?: PexoPledgeState | null;
  /** Phase 2: the highest level-band form reached (never goes down), and the small Climb summary. */
  form?: PexoFormName | null;
  climb?: PexoClimbSummary | null;
  /** Finished onboarding before they had Pexo: one "Meet Pexo" moment (hello lines + the tour). */
  meetPexo?: boolean;
};

export type PexoQuest = "focus" | "dayclose" | "revision" | "mistake" | "practice" | "backlog" | "friend";
export type PexoHomeBubble = { key: string; triggers: string[]; context: Record<string, string | number>; exclude: string[]; actions: { label: string; href: string }[] };
export type PexoQuests = { done: PexoQuest[]; justDone: PexoQuest[]; recommend: PexoQuest | null; allDone: boolean };
export type PexoNudge = { trigger: string; context: Record<string, string | number>; action: { label: string; href: string } | null };
export type PexoCare = { active: boolean; reason: "low_mood" | "burnout" | "rest_day" | null; distress: boolean };

export type PexoAskAnswer = {
  trigger: "ask.next.task" | "ask.next.revision" | "ask.next.mistakes" | "ask.next.backlog" | "ask.next.rest";
  context: Record<string, string | number>;
  action:
    | { kind: "focus"; label: string; taskId?: string; subjectId?: number; chapterId?: string; taskType: "self_study" | "revision" | "practice" | "lecture" | "backlog"; minutes: number }
    | { kind: "link"; label: string; href: string }
    | null;
};
export type PexoTeaser = { trigger: "dayclose.teaser.revision" | "dayclose.teaser"; context: Record<string, string> };

export type PexoClientEvent = "tour_completed" | "tour_skipped" | "onboarding_step_completed" | "share_prompt_shown" | "shared" | "invite_sent" | "notification_opened" | "bubble_action";

/** What Pexo showed since the last heartbeat. It rides `POST /xp/heartbeat`, never a request of its own. */
export type PexoBatch = {
  shown?: string[];
  firstVisits?: string[];
  marks?: string[];
  events?: { name: PexoClientEvent; props?: Record<string, string | number | boolean | null> }[];
};

export type PexoSettingsInput = { language?: PexoLanguage; bubbles?: "normal" | "quiet"; notifications?: boolean };

export type PexoFind = { id: number; type: "trick" | "common_mistake" | "one_liner"; subject: string; chapter: string; chapterId: string | null; text: string; saved: boolean };
export type PexoPledgeProgress = { weekStart: string; hours: number; questions: number; done: { hours: number; questions: number }; mid: "ahead" | "behind" | null };
export type PexoPledgeState = { current: PexoPledgeProgress | null; settled: { weekStart: string; result: "hit" | "missed" } | null };

/** After a focus session of 15 minutes or more: one find. Asked once by the session's end screen. */
export const getPexoFind = (q: { minutes: number; chapterId?: string | null; subjectId?: number | null }) => {
  const p = new URLSearchParams({ minutes: String(Math.max(0, Math.round(q.minutes))) });
  if (q.chapterId) p.set("chapterId", q.chapterId);
  if (q.subjectId != null) p.set("subjectId", String(q.subjectId));
  return core<PexoFind | null>(`/find?${p.toString()}`);
};
export const savePexoFind = (id: number, saved: boolean) => core<{ saved: boolean }>(`/finds/${id}/save`, { method: "PUT", body: JSON.stringify({ saved }) });
export const listPexoFinds = () => core<PexoFind[]>("/finds");
export const setPexoPledge = (input: { weekStart: string; hours: number; questions: number }) => core<PexoPledgeProgress>("/pledge", { method: "PUT", body: JSON.stringify(input) });

/** "What should I do now?": asked when the student taps Pexo. */
export const askPexo = () => core<PexoAskAnswer | null>("/ask");
/** The line Day Close ends on. */
export const getPexoTeaser = () => core<PexoTeaser | null>("/teaser");

export const updatePexoSettings = (input: PexoSettingsInput) => core<PexoState>("/settings", { method: "PUT", body: JSON.stringify(input) });

// Part D: Climb Together, invite links, duels, batch rank, studying with a friend. Read once per screen, never polled.
export type PexoLine = { trigger: string; context: Record<string, string | number> } | null;
export type PexoPerson = { userId: string; name: string; username: string | null; avatarUrl: string | null };
export type PexoTogether = { id: string; friend: PexoPerson; status: "pending_in" | "pending_out" | "active"; streak: number; best: number; freezes: number; today: { me: boolean; friend: boolean }; line: PexoLine };
export type PexoDuel = { id: string; friend: PexoPerson; status: "pending_in" | "pending_out" | "active" | "done"; me: number; them: number; endsAt: string | null; result: "won" | "lost" | "draw" | null; line: PexoLine };
export type PexoSocial = {
  together: PexoTogether[];
  duels: PexoDuel[];
  invite: { code: string; joined: number; rewarded: number; recent: { inviteeId: string; name: string }[] };
  batch: { rank: number; coaching: string } | null;
  care: boolean;
};

export const getPexoSocial = () => core<PexoSocial | null>("/social");
export const inviteTogether = (friendId: string) => core<{ id: string }>("/together", { method: "POST", body: JSON.stringify({ friendId }) });
export const answerTogether = (id: string, accept: boolean) => core<{ status: string }>(`/together/${id}/answer`, { method: "POST", body: JSON.stringify({ accept }) });
export const endTogether = (id: string) => core<{ status: string }>(`/together/${id}`, { method: "DELETE" });
export const challengeDuel = (friendId: string) => core<{ id: string }>("/duels", { method: "POST", body: JSON.stringify({ friendId }) });
export const answerDuel = (id: string, accept: boolean) => core<{ status: string }>(`/duels/${id}/answer`, { method: "POST", body: JSON.stringify({ accept }) });
export const claimInvite = (code: string, utm: { source?: string; medium?: string; campaign?: string }) => core<{ claimed: boolean }>("/invite/claim", { method: "POST", body: JSON.stringify({ code, utm }) });
export const joinFriendSession = (sessionId: string, friendId: string) => core<{ joined: true }>("/focus-join", { method: "POST", body: JSON.stringify({ sessionId, friendId }) });
/** Public: the /join/<code> page before signing in. */
export const lookupInvite = (code: string) => apiRequest<Envelope<{ valid: boolean; name: string | null }>>(`${CORE_API_BASE_URL}/api/pexo/invite/${encodeURIComponent(code)}`).then((r) => r.data);
/** The personal link a student shares. */
export const inviteLink = (code: string) => `${typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "")}/join/${code}`;

// Phase 2: the Climb.
export type PexoFormName = "aspirant" | "grinder" | "solver" | "ranker" | "topper" | "iitian";
export type PexoClimbSummary = { steps: number; todayStudied: boolean; form: PexoFormName; daysToExam: number | null; rocksOpen: number; gems: number };
export type ClimbStep = {
  date: string;
  minutes: number;
  studied: boolean;
  planDone: boolean;
  landmarks: { chapterId: string; name: string; subject: string; subjectId: number }[];
  checkpoints: { id: string; testType: string; examPattern: string; score: { total: number; max: number } | null }[];
  smashed: { id: string; chapter: string }[];
  gems: number;
  milestone: number | null;
};
export type ClimbRock = { key: string; chapterId: string | null; chapter: string; subjectId: number | null; hoursLeft: number; size: "small" | "medium" | "large"; lane: string | null; backlogId: string };
export type ClimbTotals = { start: string; day: number; steps: number; chapters: number; mocks: number; rocksSmashed: number; gems: number; form: PexoFormName; daysToExam: number | null; todayStudied: boolean; todayMinutes: number };
export type ClimbPage = {
  month: string;
  steps: ClimbStep[];
  nextCursor: string | null;
  base: { n: number; chapters: { name: string; subject: string; subjectId: number }[] } | null;
  upcoming: { peak: { examDate: string; daysLeft: number } | null; milestones: { days: number; date: string; reached: boolean }[]; rocks: ClimbRock[] } | null;
  totals: ClimbTotals | null;
};
export type ClimbFriend = { userId: string; name: string; username: string | null; avatarUrl: string | null; form: PexoFormName; steps: number; studiedToday: boolean };
export const getClimbPage = (cursor?: string | null) => core<ClimbPage | null>(cursor ? `/climb?cursor=${cursor}` : "/climb");
export const getClimbFriends = () => core<ClimbFriend[] | null>("/climb/friends");
