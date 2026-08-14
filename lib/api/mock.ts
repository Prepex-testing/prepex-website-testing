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
};

export type MockTopicScoreInput = {
  chapterId: string;
  subjectId: number;
  questionsAttempted: number;
  questionsCorrect: number;
};

export type SubmitMockInput = {
  attemptedDate: string;
  mockName: string;
  sourceInstitute: string;
  examType: string;
  totalScore: number;
  maxScore: number;
  timeTakenMinutes: number;
  testDurationMinutes?: number;
  entryMethod: MockEntryMethod;
  entryTier: MockEntryTier;
  subjectScores?: MockSubjectScoreInput[];
  topicScores?: MockTopicScoreInput[];
};

export function submitMock(input: SubmitMockInput) {
  return authRequest<{ success: true; data: unknown }>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
