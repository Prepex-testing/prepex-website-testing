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
