import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest } from "@/lib/api/http";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/weekly-journal${path}`, options);
}

// ---------------------------------------------------------------------------
// Section 7 — Weekly Win Journal
// ---------------------------------------------------------------------------

export type JournalHero = {
  title: string | null;
  description: string | null;
  /** 1-6, the locked hero priority tier (PRD 7.3.2). */
  tier: number | null;
};

export type JournalStats = {
  activeDays: number;
  tasksCompleted: number;
  focusSeconds: number;
  focusHoursLabel: string;
  streakCount: number;
  chaptersMastered: number;
  topics: string[];
  /** Relative only — the absolute mock score never leaves the server. */
  mockDelta: number | null;
  paceDeltaPercent: number | null;
  paceLabel: string | null;
  lowEnergyDays: number;
  isRecoveryWeek: boolean;
  badDayReturn: boolean;
};

export type JournalCard = {
  id: string;
  shareSlug: string;
  weekStart: string | null;
  weekEnd: string | null;
  weekLabel: string | null;
  hero: JournalHero;
  imageUrl: string | null;
  stats: JournalStats;
  viewedAt: string | null;
  generatedAt: string;
};

export type JournalSettings = {
  winJournalEnabled: boolean;
  winJournalNotify: boolean;
  winJournalInParentReport: boolean;
};

export function getLatestJournal() {
  return authRequest<{ success: true; data: JournalCard | null }>("/latest");
}

export function getJournalHistory() {
  return authRequest<{ success: true; data: JournalCard[] }>("");
}

export function getJournalById(id: string) {
  return authRequest<{ success: true; data: JournalCard }>(`/${id}`);
}

/** Regenerates this week's card on demand (also the manual escape hatch if
 *  Friday's cron run was skipped). */
export function generateJournal() {
  return authRequest<{ success: true; data: JournalCard | null; message?: string }>("/generate", {
    method: "POST",
  });
}

/** Marks the card seen, which suppresses the Friday notification for a
 *  student who opened the app before it arrived (PRD 7.8). */
export function markJournalViewed(id: string) {
  return authRequest<{ success: true; data: { viewedAt: string } }>(`/${id}/viewed`, {
    method: "POST",
  });
}

export function getJournalSettings() {
  return authRequest<{ success: true; data: JournalSettings }>("/settings");
}

export function updateJournalSettings(patch: Partial<JournalSettings>) {
  return authRequest<{ success: true; data: JournalSettings }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// ---------------------------------------------------------------------------
// Public share view (no auth — this is what a copied link opens)
// ---------------------------------------------------------------------------

export type SharedJournalCard = {
  firstName: string;
  weekLabel: string | null;
  hero: JournalHero;
  imageUrl: string | null;
  stats: Pick<
    JournalStats,
    | "activeDays"
    | "tasksCompleted"
    | "focusHoursLabel"
    | "streakCount"
    | "chaptersMastered"
    | "topics"
    | "mockDelta"
    | "paceLabel"
  >;
};

export function getSharedJournal(slug: string) {
  return apiRequest<{ success: true; data: SharedJournalCard }>(
    `${CORE_API_BASE_URL}/api/weekly-journal/share/${encodeURIComponent(slug)}`,
  );
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** The card PNG lives on the core service, which is a different origin from
 *  the app in every environment — so the stored path is always joined here. */
export function journalImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${CORE_API_BASE_URL}${imageUrl}`;
}

/** Public, shareable link to a card. Built from the browser's own origin so
 *  it works unchanged across local, preview and production. */
export function journalShareUrl(shareSlug: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://prepex.io");
  return `${origin}/win/${shareSlug}`;
}
