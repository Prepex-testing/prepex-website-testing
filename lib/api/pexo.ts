import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
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
