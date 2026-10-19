"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportView } from "@/components/diagnosis/ReportView";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { PageLoader } from "@/components/ui/PageLoader";
import { getStudentChapters } from "@/lib/api/onboarding";
import { useReportLive } from "@/lib/diagnosis/useReportLive";
import { useStartReport } from "@/lib/diagnosis/useStartReport";

/** One 30-day diagnosis: waits for it, shows it being written, then the finished report. */
export default function DiagnosisReportPage() {
  const { id } = useParams<{ id: string }>();
  const { report, loadError, tooLong } = useReportLive(id);
  const { start, starting, error: startError } = useStartReport(true);
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);

  const complete = report?.status === "complete";
  useEffect(() => {
    if (!complete) return;
    // the plan's lines are matched to the student's chapters (every class) so "Save to goals" can carry one
    void getStudentChapters({ allClasses: true }).then(
      (res) => setChapters(res.data.flatMap((s) => s.chapters.map((c) => ({ id: c.id, name: c.name })))),
      () => undefined,
    );
  }, [complete]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="diagnosis-page">
      <ProfileSubpageHeader title="Your 30-day diagnosis" backHref="/analytics" />
      {loadError ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger" data-testid="diagnosis-load-error">
          {loadError}
        </p>
      ) : !report ? (
        <PageLoader label="Opening your diagnosis…" />
      ) : (
        <ReportView report={report} chapters={chapters} tooLong={tooLong} starting={starting} startError={startError} onTryAgain={() => void start()} />
      )}
    </div>
  );
}
