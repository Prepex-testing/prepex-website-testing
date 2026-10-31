import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** Boards, profiles and following. core-service /api/productivity/leaderboard and /api/social. */

type Envelope<T> = { success: true; data: T };

const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api${path}`, options).then((r) => r.data);
const send = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export type BoardKind = "today" | "month" | "improved";
export type BoardFilter = "following" | "coaching" | "year" | "india";

export type BoardRow = {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  title: string;
  xp: number;
  hours: number;
  isMe: boolean;
  improvement?: { thisAvg: number; prevAvg: number; delta: number };
};

export type BoardResult = {
  board: BoardKind;
  filter: BoardFilter;
  from: string;
  to: string;
  resetsOn: string;
  total: number;
  rows: BoardRow[];
  me: { rank: number | null; xp: number; hours: number; hidden: boolean; gapToAbove: { xp: number; rank: number; name: string } | null };
};

export type BoardRules = { earn: { label: string; value: string }[]; resets: { today: string; month: string; improved: string }; caps: string[] };
export type Hall = { months: string[]; month: string | null; boards: { board: string; label: string; rows: { rank: number; name: string; username: string | null; xp: number }[] }[] };

export const getBoard = (q: { board: BoardKind; filter: BoardFilter; limit?: number }) =>
  core<BoardResult>(`/productivity/leaderboard?board=${q.board}&filter=${q.filter}${q.limit !== undefined ? `&limit=${q.limit}` : ""}`);
export const getBoardRules = () => core<BoardRules>("/productivity/leaderboard/rules");
export const getHall = (month?: string) => core<Hall>(`/productivity/leaderboard/hall${month ? `?month=${month}` : ""}`);

export type SocialSettings = { username: string | null; displayName: string | null; leaderboardHidden: boolean; showAccuracy: boolean; showMockScores: boolean };
export const getSocialSettings = () => core<SocialSettings>("/social/settings");
export const updateSocialSettings = (patch: Partial<SocialSettings>) => core<SocialSettings>("/social/settings", send("PATCH", patch));

export type Identity = { userId: string; name: string; username: string | null; avatarUrl: string | null };
export const searchStudents = (q: string) => core<Identity[]>(`/social/search?q=${encodeURIComponent(q)}`);

export type PublicProfile = {
  userId: string;
  isSelf: boolean;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  classLabel: string | null;
  exam: string | null;
  examYear: number | null;
  coaching: string | null;
  city: string | null;
  level: number;
  title: string;
  totalXp: number;
  streak: { current: number; longest: number };
  heatmap: { date: string; minutes: number }[];
  allTimeHours: number;
  questions: number;
  chaptersCompleted: number;
  subjectSplit: { subjectId: number; name: string | null; minutes: number }[];
  badges: { key: string; title: string }[];
  followers: number;
  following: number;
  isFollowing: boolean;
  blockedByMe: boolean;
  accuracy?: number | null;
  latestMockPercent?: number | null;
  settings?: { showAccuracy: boolean; showMockScores: boolean; leaderboardHidden: boolean };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** A profile is reachable by @username or, from an avatar with no username, by id. */
export const getProfile = (ref: string) => core<PublicProfile>(UUID.test(ref) ? `/social/profile/${ref}` : `/social/profile/u/${encodeURIComponent(ref.replace(/^@/, ""))}`);
export const profileHref = (who: { userId: string; username: string | null }) => `/u/${who.username ?? who.userId}`;

export const followStudent = (id: string) => core<{ following: true }>(`/social/follow/${id}`, send("POST"));
export const unfollowStudent = (id: string) => core<{ following: false }>(`/social/follow/${id}`, send("DELETE"));
export const blockStudent = (id: string) => core<{ blocked: true }>(`/social/block/${id}`, send("POST"));
export const unblockStudent = (id: string) => core<{ blocked: false }>(`/social/block/${id}`, send("DELETE"));
export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "fake_activity", label: "Fake activity" },
  { value: "other", label: "Something else" },
] as const;
export const reportStudent = (id: string, reason: (typeof REPORT_REASONS)[number]["value"], note?: string) => core<{ reported: true }>(`/social/report/${id}`, send("POST", { reason, ...(note ? { note } : {}) }));
export const sendKudos = (toUserId: string, targetType: "day" | "badge", targetKey: string) => core<{ sent: true }>("/social/kudos", send("POST", { toUserId, targetType, targetKey }));

export type StudyingNow = { userId: string; name: string; username: string | null; avatarUrl: string | null; subjectName: string | null; minutes: number; onBreak: boolean };
export const getStudyingNow = () => core<StudyingNow[]>("/social/studying-now");

/** "Physics · 1h 12m", or "On break". */
export function presenceLabel(s: Pick<StudyingNow, "subjectName" | "minutes" | "onBreak">): string {
  if (s.onBreak) return "On break";
  const h = Math.floor(s.minutes / 60);
  const m = s.minutes % 60;
  const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return `${s.subjectName ?? "Studying"} · ${time}`;
}
