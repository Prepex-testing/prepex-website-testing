import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/profile${path}`, options);
}

export type ProfileSubject = { id: number; code: string; name: string };

export type ChapterMetadata = {
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  recommendedWindow: string;
  averageLearningMinutes: number;
  averageRevisionMinutes: number;
  averagePracticeQuestions: number;
} | null;

export type ProfileChapter = {
  id: string;
  subjectId: number;
  name: string;
  // Null for the many chapters that were never given a syllabus position —
  // the API returns null here, so callers must handle it rather than
  // rendering a bare "Chapter ".
  sequenceOrder: number | null;
  /** NCERT class the chapter belongs to — 11 or 12, or null. */
  class: number | null;
  isActive: boolean;
  subject: ProfileSubject;
  chapterMetadata: ChapterMetadata;
};

export type SubjectWithChapters = ProfileSubject & { chapters: ProfileChapter[] };

export type SubjectsChaptersResponse = {
  subjects: SubjectWithChapters[];
};

export function getSubjectsChapters() {
  return authRequest<{ success: true; data: SubjectsChaptersResponse }>("/subjects-chapters");
}

// ---------------------------------------------------------------------------
// Profile page — GET/PATCH /api/profile
// ---------------------------------------------------------------------------

export type AcademicLevel = "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";
export type CoachingType = "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP";
export type StudyWindow = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

export type ProfileOverview = {
  fullName: string;
  email: string;
  city: string | null;
  phoneNumber: string | null;
  memberSince: string;
  /** Most recent app open (debounced ~30 min server-side). */
  lastSeenAt: string | null;
  /** False until onboarding has created a profile. */
  hasProfile: boolean;
  completion: {
    percent: number;
    /** Labels of what's still unfilled, e.g. ["City", "Leaderboard name"]. */
    missing: string[];
  };
  exam: { id: string; name: string } | null;
  /** The student's own date (YYYY-MM-DD); null if they haven't set one. */
  targetExamDate: string | null;
  /** What to count down to — their date, else the exam's default. */
  examDate: string | null;
  examDateIsDefault: boolean;
  /** Signed: negative once the date has passed. */
  daysUntilExam: number | null;
  currentLevel: AcademicLevel | null;
  coachingType: CoachingType | null;
  coachingName: string | null;
  batchName: string | null;
  studyPreferences: {
    weekdayHours: number;
    weekendHours: number;
    sameDailyTarget: boolean;
    studyWindows: StudyWindow[];
  } | null;
  partner: { status: "PENDING" | "ACTIVE" | "PAUSED"; name: string | null } | null;
};

export function getProfileOverview() {
  return authRequest<{ success: true; data: ProfileOverview }>("/overview");
}

/**
 * Core-owned fields. Name, city and phone go through `updateIdentity` in
 * lib/api/account.ts; the target exam can't be changed from here, since that
 * resets the student's subject selection.
 */
export type ProfileUpdate = Partial<{
  currentLevel: AcademicLevel;
  targetExamDate: string | null;
  coachingType: CoachingType;
  coachingName: string | null;
  batchName: string | null;
  weekdayHours: number;
  weekendHours: number;
  sameDailyTarget: boolean;
  studyWindows: StudyWindow[];
}>;

export function updateProfile(input: ProfileUpdate) {
  return authRequest<{ success: true; data: ProfileOverview }>("", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// --- display helpers -------------------------------------------------------

export const ACADEMIC_LEVEL_LABEL: Record<AcademicLevel, string> = {
  CLASS_11: "Class 11",
  CLASS_12: "Class 12",
  DROPPER_1: "Dropper (1st year)",
  DROPPER_2: "Dropper (2nd year)",
  OTHER: "Other",
};

export const COACHING_TYPE_LABEL: Record<CoachingType, string> = {
  COACHING: "Coaching",
  SELF_PREP: "Self-prep",
  ONLINE_SELF_PREP: "Online self-prep",
};

export const STUDY_WINDOW_LABEL: Record<StudyWindow, string> = {
  MORNING: "Morning",
  MIDDAY: "Midday",
  EVENING: "Evening",
  NIGHT: "Night",
};

/**
 * Profile photo. `avatarUrl` is a path on core-service ("/uploads/avatars/…");
 * render it through `avatarSrc` in lib/profile/avatar, which prefixes the host.
 */
export function getAvatar() {
  return authRequest<{ success: true; data: { avatarUrl: string | null } }>("/avatar");
}

export function uploadAvatar(image: Blob) {
  const formData = new FormData();
  formData.append("avatar", image, "avatar.jpg");
  return authRequest<{ success: true; data: { avatarUrl: string } }>("/avatar", {
    method: "POST",
    body: formData,
  });
}

export function removeAvatar() {
  return authRequest<{ success: true; data: { avatarUrl: null } }>("/avatar", { method: "DELETE" });
}
