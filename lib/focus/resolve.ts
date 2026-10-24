import type { SubjectChapters } from "@/lib/api/dashboard";
import type { ResolvedIntent } from "@/lib/api/focus";
import {
  DEFAULT_TARGET_MINUTES,
  MAX_TARGET_MINUTES,
  MIN_TARGET_MINUTES,
  defaultMode,
  type FocusSessionIntent,
  type ResolvedFocusIntent,
} from "@/lib/focus/intent";

const letters = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, "");

/**
 * "physics" / "Maths" / "2" → the student's subject id. Names match loosely (maths is Mathematics), a numeric string is
 * a subject id, and a code (PHY) matches too. Null when nothing matches — the student then picks the subject.
 */
export function subjectIdFromHint(hint: string | undefined, subjects: SubjectChapters[]): number | null {
  const raw = hint?.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return subjects.some((s) => s.subjectId === id) ? id : null;
  }
  const wanted = letters(raw);
  if (!wanted) return null;
  const byCode = subjects.find((s) => letters(s.subjectCode) === wanted);
  if (byCode) return byCode.subjectId;
  const prefix = wanted.slice(0, 4);
  const byName = subjects.find((s) => {
    const name = letters(s.subjectName);
    return name === wanted || (prefix.length >= 4 && name.startsWith(prefix));
  });
  return byName?.subjectId ?? null;
}

/** The subject a chapter belongs to, from the student's syllabus. */
export function subjectIdOfChapter(chapterId: string | null | undefined, subjects: SubjectChapters[]): number | null {
  if (!chapterId) return null;
  return subjects.find((s) => s.chapters.some((c) => c.id === chapterId))?.subjectId ?? null;
}

const clampTarget = (minutes: number): number => Math.min(MAX_TARGET_MINUTES, Math.max(MIN_TARGET_MINUTES, Math.round(minutes)));

/**
 * What the timer opens with. The server's answer (it read the task, goal, backlog item or mistake itself) is the
 * truth for subject, chapter, topic and length; the link's own hints fill whatever the server could not, and the
 * button the student pressed decides the task type. Nothing is invented: a field nobody knows stays empty and editable.
 */
export function resolveFocusIntent(hint: FocusSessionIntent, server: ResolvedIntent | null, subjects: SubjectChapters[]): ResolvedFocusIntent {
  const chapterCandidate = server?.chapterId ?? hint.chapter ?? null;
  const subjectId = server?.subjectId ?? subjectIdFromHint(hint.subject, subjects) ?? subjectIdOfChapter(chapterCandidate, subjects);

  // A chapter is only kept when it belongs to the subject that ends up chosen (and exists for this student).
  const chapterId =
    chapterCandidate && subjectId !== null && subjects.find((s) => s.subjectId === subjectId)?.chapters.some((c) => c.id === chapterCandidate)
      ? chapterCandidate
      : null;

  const targetMinutes = clampTarget(server?.targetMinutes ?? hint.targetMinutes ?? DEFAULT_TARGET_MINUTES);
  return {
    originSource: hint.originSource,
    originId: server?.originId ?? hint.originId ?? null,
    subjectId,
    chapterId,
    topic: (server?.topic ?? hint.topic ?? "").slice(0, 200),
    taskType: hint.taskType ?? server?.taskType ?? "self_study",
    targetMinutes,
    mode: hint.mode ?? defaultMode(targetMinutes),
    notice: hint.notice ?? null,
  };
}

/** Does this link need the server to fill it in? Anything that names a row by id does. */
export function needsServerIntent(hint: FocusSessionIntent): boolean {
  if (hint.originSource === "standalone" || hint.originSource === "home_quick_tile") return false;
  return Boolean(hint.originId) || Boolean(hint.chapter && (hint.originSource === "syllabus_overview" || hint.originSource === "practice_tab" || hint.originSource === "revision_tab"));
}
