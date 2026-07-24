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

export function getExams() {
  return request<{ success: true; data: Exam[] }>("/exams");
}

export function getSubjects() {
  return request<{ success: true; data: Subject[] }>("/subjects");
}

export function getChapters() {
  return request<{ success: true; data: SubjectChapters[] }>("/chapters");
}
