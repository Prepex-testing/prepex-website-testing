import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/profile${path}`;
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw err;
    }

    const { data: newTokens } = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);

    return apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
    });
  }
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
  sequenceOrder: number;
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
