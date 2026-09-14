import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/mock${path}`, options);
}

export type MockEntryMethod = "MANUAL" | "OCR" | "QUICK_LOG";
export type MockEntryTier = "QUICK" | "BASIC" | "MEDIUM";

export type MockSubjectScoreInput = {
  subjectId: number;
  score: number;
  maxScore: number;
  timeTakenMinutes?: number;
  testDurationMinutes?: number;
};

export type MockTopicScoreInput = {
  chapterId: string;
  subjectId: number;
  questionsAttempted: number;
  questionsCorrect: number;
};

/**
 * Only attemptedDate and mockName are required by the backend. Every other
 * field is a zod `.optional()` — it accepts the key being absent, but
 * rejects an explicit `null` ("expected number, received null"). So these
 * are typed `?:` (no `| null`) and must be genuinely omitted, not passed as
 * null, when the form has no value for them. JSON.stringify drops
 * `undefined`-valued keys, which is what actually makes that omission work.
 */
export type SubmitMockInput = {
  attemptedDate: string;
  mockName: string;
  sourceInstitute?: string;
  examType?: string;
  totalScore?: number;
  maxScore?: number;
  timeTakenMinutes?: number;
  testDurationMinutes?: number;
  entryMethod?: MockEntryMethod;
  entryTier?: MockEntryTier;
  subjectScores?: MockSubjectScoreInput[];
  topicScores?: MockTopicScoreInput[];
};

export function submitMock(input: SubmitMockInput) {
  return authRequest<{ success: true; data: MockAnalysisItem }>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMock(id: string, input: Partial<SubmitMockInput>) {
  return authRequest<{ success: true; data: MockAnalysisItem }>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type MockExtractedData = {
  attemptedDate: string | null;
  mockName: string | null;
  sourceInstitute: string | null;
  examType: string | null;
  totalScore: number | null;
  maxScore: number | null;
  timeTakenMinutes: number | null;
  testDurationMinutes: number | null;
  entryMethod: MockEntryMethod;
  entryTier: MockEntryTier;
  subjectScores: MockSubjectScoreInput[];
};

export type MockExtractImageResult = {
  fileUrl: string;
  parsedSuccessfully: boolean;
  summary: string;
  extractedData: MockExtractedData;
};

export function extractMockImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);
  return authRequest<{ success: true; data: MockExtractImageResult }>("/extract-image", {
    method: "POST",
    body: formData,
  });
}

export type MockAnalysisStatus = "PENDING" | "COMPLETED" | string;

export type MockSubjectAnalysis = {
  id: string;
  mockAnalysisId: string;
  subjectId: number;
  score: number;
  maxScore: number;
  accuracyPercentage: string;
  timeTakenMinutes: number | null;
  testDurationMinutes: number | null;
  createdAt: string;
  subject: { id: number; code: string; name: string };
};

export type MockTopicAnalysis = {
  id: string;
  mockAnalysisId: string;
  chapterId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  createdAt: string;
};

export type MockAnalysisItem = {
  id: string;
  userId: string;
  mockName: string;
  sourceInstitute: string;
  examType: string;
  attemptedDate: string;
  entryMethod: MockEntryMethod;
  entryTier: MockEntryTier;
  analysisStatus: MockAnalysisStatus;
  totalScore: number | null;
  maxScore: number | null;
  accuracyPercentage: string;
  timeTakenMinutes: number;
  testDurationMinutes: number | null;
  ocrProcessed: boolean;
  createdAt: string;
  updatedAt: string;
  subjectAnalysis: MockSubjectAnalysis[];
  topicAnalysis: MockTopicAnalysis[];
};

export type MockAnalysisTrend = "IMPROVED" | "DECLINED" | "SAME" | string;

export type MockAnalysisSummary = {
  totalMockCount: number;
  averageScorePercentage: number;
  bestScorePercentage: number;
  latestComparison: {
    latestScorePercentage: number;
    previousScorePercentage: number;
    changePercentagePoints: number;
    trend: MockAnalysisTrend;
  } | null;
};

export type MockAnalysisPagination = {
  total: number;
  page: number;
  limit: number;
};

export type MockAnalysisListResponse = {
  summary: MockAnalysisSummary;
  pagination: MockAnalysisPagination;
  items: MockAnalysisItem[];
  upcomingMock: MockAnalysisItem | null;
};

export function deleteMock(id: string) {
  return authRequest<{ success: true; data: unknown }>(`/${id}`, {
    method: "DELETE",
  });
}

export function getMockById(id: string) {
  return authRequest<{ success: true; data: MockAnalysisItem }>(`/${id}`);
}

// ---------------------------------------------------------------------------
// Derived analytics for one mock — GET /api/mock/:id/insights
//
// Everything here is computed by the API from what the student typed in
// (total score, total time, per-subject marks). Mocks carry no
// question-by-question data, so nothing below assumes any.
// ---------------------------------------------------------------------------

export type MockTrend = "IMPROVED" | "DECLINED" | "SAME";

export type MockDelta = {
  /** Percentage-point move, e.g. 40% → 60% is +20. */
  deltaPoints: number;
  /** Relative change against the earlier value; null when that value was 0. */
  deltaPercent: number | null;
  trend: MockTrend;
};

export type MockSliceHistoryPoint = {
  mockId: string;
  mockName: string | null;
  attemptedDate: string | null;
  score: number;
  maxScore: number;
  accuracy: number;
};

/** One subject (or chapter) of this mock, with how it moved across mocks. */
export type MockComparedSlice = {
  key: string;
  name: string;
  score: number;
  maxScore: number;
  accuracy: number | null;
  /** Nearest first, at most two — mocks that also carried this slice. */
  previousMocks: MockSliceHistoryPoint[];
  vsPrevious: MockDelta | null;
  vsTwoMocksAgo: MockDelta | null;
};

export type MockProgressionPoint = {
  mockId: string;
  mockName: string | null;
  attemptedDate: string | null;
  totalScore: number;
  maxScore: number;
  percentage: number | null;
  isCurrent: boolean;
  timeTakenMinutes: number | null;
  testDurationMinutes: number | null;
  subjects: {
    subjectId: number;
    name: string;
    score: number;
    maxScore: number;
    accuracy: number | null;
    timeTakenMinutes: number | null;
  }[];
};

export type MockWin = {
  kind: "SUBJECT" | "CHAPTER";
  key: string;
  name: string;
  from: number;
  to: number | null;
  deltaPoints: number;
  deltaPercent: number | null;
};

export type MockGuidance = {
  severity: "CRITICAL" | "WARNING" | "POSITIVE" | "INFO";
  title: string;
  message: string;
};

export type MockInsights = {
  mockId: string;
  mockName: string | null;
  attemptedDate: string | null;
  totalScore: number;
  maxScore: number;
  percentage: number | null;
  mockNumber: number | null;
  totalMockCount: number;
  previousMock: {
    mockId: string;
    mockName: string | null;
    attemptedDate: string | null;
    totalScore: number;
    maxScore: number;
    percentage: number | null;
  } | null;
  totalComparison: MockDelta | null;
  /** Raw marks gained/lost vs the last mock; null unless both were out of the same total. */
  marksDelta: number | null;
  subjects: MockComparedSlice[];
  chapters: MockComparedSlice[];
  progression: MockProgressionPoint[];
  wins: MockWin[];
  guidance: MockGuidance[];
  timeNote: string | null;
};

export function getMockInsights(id: string) {
  return authRequest<{ success: true; data: MockInsights }>(`/${id}/insights`);
}

export function getMockAnalysisList(params: { page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const queryString = query.toString();
  return authRequest<{ success: true; data: MockAnalysisListResponse }>(
    queryString ? `?${queryString}` : "",
  );
}
