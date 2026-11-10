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
};

export type PexoClientEvent = "tour_completed" | "tour_skipped" | "onboarding_step_completed" | "share_prompt_shown" | "shared" | "invite_sent" | "notification_opened" | "bubble_action";

/** What Pexo showed since the last heartbeat. It rides `POST /xp/heartbeat`, never a request of its own. */
export type PexoBatch = {
  shown?: string[];
  firstVisits?: string[];
  marks?: string[];
  events?: { name: PexoClientEvent; props?: Record<string, string | number | boolean | null> }[];
};

export type PexoSettingsInput = { language?: PexoLanguage; bubbles?: "normal" | "quiet"; notifications?: boolean };

export const updatePexoSettings = (input: PexoSettingsInput) => core<PexoState>("/settings", { method: "PUT", body: JSON.stringify(input) });
