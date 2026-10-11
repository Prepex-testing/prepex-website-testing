import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query, type Page, type PlannerPlacement, type PlannerWindow } from "@/lib/api/logsCommon";

/** Mock test log — core-service /api/mocks (not /api/mock, the planner's per-question mock analysis). */

export type TestType = "full_mock" | "sectional" | "chapter_test" | "phase_test" | "toppers_test";
export type ExamPattern = "jee_main" | "jee_advanced" | "neet";
export type MockSubject = "physics" | "chemistry" | "maths" | "biology";

export type MockTest = {
  id: string;
  testType: TestType;
  examPattern: ExamPattern;
  testName: string | null;
  /** `YYYY-MM-DD` */
  dateTaken: string;
  totalMarks: number;
  maxMarks: number;
  scorePercent: number;
  subjectMarks: Record<MockSubject, number | null>;
  timeMinutes: number | null;
  questionsCorrect: number | null;
  questionsWrong: number | null;
  questionsSkipped: number | null;
  weakChapters: { chapterId: string; name: string | null }[];
  percentile: number | null;
  /** Projected from the percentile against `candidatePool` — an assumption, not a prediction. */
  projectedRank: number | null;
  candidatePool: number;
  notes: string | null;
  createdAt: string;
};

export type NewMock = {
  testType: TestType;
  examPattern: ExamPattern;
  testName?: string | null;
  dateTaken: string;
  totalMarks: number;
  maxMarks?: number;
  physicsMarks?: number | null;
  chemistryMarks?: number | null;
  mathsMarks?: number | null;
  biologyMarks?: number | null;
  timeMinutes?: number | null;
  questionsCorrect?: number | null;
  questionsWrong?: number | null;
  questionsSkipped?: number | null;
  weakChapterIds?: string[];
  percentile?: number | null;
  notes?: string | null;
};

export type MockPeriod = "month" | "quarter" | "all";

export type MockProjection = {
  examPattern: ExamPattern;
  latestPercentile: number;
  projectedRank: number;
  candidatePool: number;
  asOf: string;
  mockId: string;
  targetRank: number | null;
  targetGap: number | null;
};

export type MockAnalytics = {
  period: MockPeriod;
  range: { from: string; to: string } | null;
  filters: { examPattern: ExamPattern | null; testType: TestType | null };
  totals: { mocks: number };
  byType: { testType: TestType; count: number }[];
  score: { averagePercent: number; bestPercent: number; latestPercent: number; firstPercent: number; changePoints: number } | null;
  trend: { mockId: string; date: string; testName: string | null; testType: TestType; examPattern: ExamPattern; totalMarks: number; maxMarks: number; scorePercent: number; percentile: number | null; projectedRank: number | null }[];
  subjects: { subject: MockSubject; mocks: number; averageMarks: number; bestMarks: number; latestMarks: number }[];
  timing: { mocksWithTime: number; averageMinutes: number | null };
  questions: { mocks: number; correct: number; wrong: number; skipped: number; attempted: number; accuracy: number | null };
  weakChapters: { chapterId: string; mocks: number; lastDate: string }[];
  weakChapterNames: Record<string, string | null>;
  projection: MockProjection | null;
};

export type MockShareCard = {
  aspect: "9:16";
  brand: "Prepex";
  headline: string;
  mock: { id: string; name: string | null; testType: TestType; examPattern: ExamPattern; date: string };
  totalMarks: number;
  maxMarks: number;
  scorePercent: number;
  subjectMarks: Record<MockSubject, number | null>;
  percentile: number | null;
  projectedRank: number | null;
  candidatePool: number;
  vsPrevious: number | null;
  weakChapters: string[];
  generatedAt: string;
};

export type WeakPlanResult = { assignments: (PlannerPlacement & { chapterId: string; chapterName: string | null })[] };

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/mocks${path}`, options);
}

export function listMocks(q: { from?: string; to?: string; testType?: TestType | null; examPattern?: ExamPattern | null; cursor?: string | null; limit?: number } = {}) {
  return request<{ success: true; data: Page<MockTest> }>(query(q));
}

export function createMock(input: NewMock) {
  return request<{ success: true; data: MockTest }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateMock(id: string, patch: Partial<NewMock>) {
  return request<{ success: true; data: MockTest }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteMock(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

export function getMockAnalytics(q: { period: MockPeriod; examPattern?: ExamPattern | null; testType?: TestType | null; targetRank?: number | null }) {
  return request<{ success: true; data: MockAnalytics }>(`/analytics${query(q)}`);
}

export function getMockShareCard(mockId: string) {
  return request<{ success: true; data: MockShareCard }>(`/share-card${query({ mockId })}`);
}

export function addWeakChaptersToPlanner(id: string, input: { dates: string[]; timeSlot?: PlannerWindow; estimatedMinutes?: number }) {
  return request<{ success: true; data: WeakPlanResult }>(`/${id}/add-weak-chapters-to-planner`, { method: "POST", body: JSON.stringify(input) });
}
