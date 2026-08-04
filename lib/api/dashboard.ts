import { DASHBOARD_API_BASE_URL } from "@/lib/api/config";
import { apiRequest } from "@/lib/api/http";

export type Exam = {
  id: string;
  code: string;
  name: string;
  defaultExamDate: string | null;
  isActive: boolean;
};

export type Subject = {
  id: number;
  code: string;
  name: string;
};

export type Chapter = {
  id: string;
  subjectId: number;
  name: string;
  sequenceOrder: number;
  isActive: boolean;
};

export type SubjectChapters = {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  chapters: Chapter[];
};

function request<T>(path: string): Promise<T> {
  return apiRequest<T>(`${DASHBOARD_API_BASE_URL}/api/dashboard${path}`);
}

let examsCache: Promise<{ success: true; data: Exam[] }> | null = null;

export function getExams() {
  if (!examsCache) {
    examsCache = request<{ success: true; data: Exam[] }>("/exams").catch((err) => {
      examsCache = null;
      throw err;
    });
  }
  return examsCache;
}

export function getSubjects() {
  return request<{ success: true; data: Subject[] }>("/subjects");
}

export function getSubjectsByExam(examId: string) {
  return request<{ success: true; data: Subject[] }>(`/subjects/by-exam/${examId}`);
}

export function getChapters() {
  return request<{ success: true; data: SubjectChapters[] }>("/chapters");
}
