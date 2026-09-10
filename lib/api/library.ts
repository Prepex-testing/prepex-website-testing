import { DASHBOARD_API_BASE_URL } from "@/lib/api/config";
import { apiRequest } from "@/lib/api/http";

/**
 * Unified content library — GET /api/dashboard/resources/library.
 *
 * Unlike most of `lib/api/*`, this uses the plain `apiRequest` rather than
 * `authenticatedRequest`: the route is public on dashboard-service (like
 * /exams, /subjects and /chapters), so no token is attached.
 *
 * The endpoint returns all four content types in one response, each with its
 * own array and its own total in `counts`. `page`/`limit` apply to every array
 * at once, so callers that paginate a single section should pass `contentType`
 * to narrow the response to just that section.
 */

export type LibraryContentType = "NOTE" | "FORMULA_SHEET" | "PRACTICE_QUESTION" | "YOUTUBE";

export type LibrarySubjectRef = { id: number; code: string; name: string };

export type LibraryChapterRef = {
  id: string;
  name: string;
  sequenceOrder: number | null;
  class: number | null;
};

type ResourceBase = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  title: string;
  description: string | null;
  class: number | null;
  createdAt: string;
  updatedAt: string;
  subject: LibrarySubjectRef;
  chapter: LibraryChapterRef | null;
};

/** type: "NOTE" — concept cards from Prepex_Notes.txt. */
export type LibraryNote = ResourceBase & {
  type: "NOTE";
  oneLiner: string | null;
  formula: string | null;
  whenToUse: string[];
  commonMistake: string | null;
  quickExample: string | null;
  connectsTo: string[];
  difficulty: string | null;
};

/** type: "FORMULA_SHEET" — one row per formula from the formula sheet file. */
export type LibraryFormulaSheet = ResourceBase & {
  type: "FORMULA_SHEET";
  /** The expression itself; `title` holds the formula's name. */
  formula: string | null;
  variables: string[];
  conditions: string[];
  jeeTrick: string | null;
};

/** type: "YOUTUBE" — lectures from Youtube_lecture_links.txt. */
export type LibraryLecture = ResourceBase & {
  type: "YOUTUBE";
  url: string | null;
  channel: string | null;
  lectureCategory: "ONE_SHOT" | "REVISION" | "TOPIC_WISE" | null;
  topic: string | null;
  publishedAt: string | null;
  durationMin: number | null;
};

export type LibraryQuestion = {
  id: string;
  subjectId: number;
  chapterId: string;
  topic: string;
  subTopic: string | null;
  questionType: string;
  difficulty: string;
  class: number | null;
  questionText: string;
  questionImageUrl: string | null;
  options: Record<string, string> | null;
  correctAnswer: unknown;
  answerText: string | null;
  solutionText: string | null;
  tags: string[];
  source: string;
  year: number | null;
  isPYQ: boolean;
  /** Free-text exam label, e.g. "JEE Main 2020 (06 Sep Shift 2)". */
  examDetail: string | null;
  createdAt: string;
  subject: LibrarySubjectRef;
  chapter: LibraryChapterRef | null;
};

export type LibraryCounts = {
  notes: number;
  formulaSheets: number;
  youtubeLectures: number;
  practiceQuestions: number;
};

export type ResourceLibraryResponse = {
  page: number;
  limit: number;
  counts: LibraryCounts;
  notes: LibraryNote[];
  formulaSheets: LibraryFormulaSheet[];
  youtubeLectures: LibraryLecture[];
  practiceQuestions: LibraryQuestion[];
};

export type ResourceLibraryParams = {
  contentType?: LibraryContentType;
  subjectName?: string;
  chapterName?: string;
  /** Match subject/chapter names exactly (case-insensitive) instead of "contains". */
  exact?: boolean;
  class?: number;
  difficulty?: string;
  search?: string;
  /** Narrows practiceQuestions to PYQ imports (true) or non-PYQ (false). */
  isPYQ?: boolean;
  page?: number;
  limit?: number;
};

export type ChapterResourceCounts = {
  subjectId: number;
  subjectName: string;
  /** Keyed by chapter id; chapters with no resources are omitted entirely. */
  counts: Record<string, LibraryCounts>;
};

/**
 * Every chapter's tallies for one subject, in a single request.
 *
 * The chapter list needs a count per row. Calling getResourceLibrary once per
 * chapter meant one request per row (67 for Chemistry) and tripped the
 * service's 100-per-15-minutes public rate limit; this answers the same
 * question with two grouped queries server-side.
 */
export function getChapterResourceCounts(
  params: { subjectName: string; class?: number },
  options: RequestInit = {},
): Promise<{ success: true; data: ChapterResourceCounts }> {
  const query = new URLSearchParams({ subjectName: params.subjectName });
  if (params.class !== undefined) query.set("class", String(params.class));

  return apiRequest<{ success: true; data: ChapterResourceCounts }>(
    `${DASHBOARD_API_BASE_URL}/api/dashboard/resources/library/chapter-counts?${query.toString()}`,
    options,
  );
}

export function getResourceLibrary(
  params: ResourceLibraryParams = {},
  options: RequestInit = {},
): Promise<{ success: true; data: ResourceLibraryResponse }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }

  return apiRequest<{ success: true; data: ResourceLibraryResponse }>(
    `${DASHBOARD_API_BASE_URL}/api/dashboard/resources/library?${query.toString()}`,
    options,
  );
}
