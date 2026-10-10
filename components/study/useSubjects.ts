"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { getStudentChapters } from "@/lib/api/onboarding";
import { makeSubjectLookup, type SubjectLookup } from "@/lib/study/subjects";

export type SubjectsState = {
  subjects: SubjectChapters[];
  status: "loading" | "ready" | "error";
  lookup: SubjectLookup;
};

/** The student's subjects and chapters (all classes), loaded once per screen. */
export function useSubjects(): SubjectsState {
  const [subjects, setSubjects] = useState<SubjectChapters[]>([]);
  const [status, setStatus] = useState<SubjectsState["status"]>("loading");

  useEffect(() => {
    let alive = true;
    // every class: a Class 12 student logs Class 11 revision and old-book mistakes too
    getStudentChapters({ allClasses: true })
      .then((res) => {
        if (!alive) return;
        setSubjects(res.data);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const lookup = useMemo(() => makeSubjectLookup(subjects), [subjects]);
  return { subjects, status, lookup };
}
