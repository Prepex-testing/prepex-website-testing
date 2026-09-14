"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyNote, StatCard } from "@/components/stats/StatCard";
import { ChevronRightIcon } from "@/components/ui/icons";
import { PageLoader } from "@/components/ui/PageLoader";
import { PrecisionRankedList } from "@/components/stats/PrecisionRankedList";
import {
  getProgressTab,
  subjectInitial,
  type ProgressTab,
} from "@/lib/api/productivity";

/** Bar colours cycle by position — subjects are whatever the student enrolled in. */
const SUBJECT_BARS = [
  "dark:bg-[var(--text-primary,#FAF7F2)]",
  "dark:bg-[#4C1D95]",
  "dark:bg-[#8B8998]",
];

const MASTERY_COLORS = [
  { key: "learning", label: "Learning", bar: "bg-brand", text: "#312E81" },
  { key: "revision", label: "Revision", bar: "bg-chart-2", text: "#4F46E5" },
  { key: "mastered", label: "Mastered", bar: "bg-success", text: "#A5B4FC" },
] as const;


/** "—" rather than a fabricated 0% when a topic has no measured accuracy. */
function accuracyLabel(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

export function ProgressStats() {
  const [data, setData] = useState<ProgressTab | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProgressTab()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your progress stats. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <PageLoader label="Loading your progress…" />;

  if (error || !data) {
    return (
      <StatCard>
        <p className="py-8 text-center text-sm font-medium text-muted">
          {error ?? "Couldn't load your progress stats."}
        </p>
      </StatCard>
    );
  }

  const { syllabusCoverage, pace, focusTopic, masteryTimeline } = data;
  const masteryCounts: Record<string, number> = {
    learning: masteryTimeline.learning,
    revision: masteryTimeline.revision,
    mastered: masteryTimeline.mastered,
  };
  // The stacked bar is a share of the chapters actually touched — an untouched
  // syllabus leaves it empty rather than implying progress.
  const masteryDenominator = Math.max(masteryTimeline.touched, 1);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {data.explainer && (
        <div className="rounded-2xl border border-brand/10 bg-tint px-4 py-3 text-xs font-semibold text-body-text sm:text-sm">
          {data.explainer}
        </div>
      )}

      {/* Exam countdown */}
      <StatCard className="w-full" padding="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold leading-tight text-ink sm:text-[18px]">
              {data.exam.name ?? "Your exam"}
              {data.exam.daysLeft !== null && (
                <span className="text-muted"> · {data.exam.daysLeft} days to go</span>
              )}
            </h2>
            {/* Compassionate copy comes straight from the API — never re-worded here. */}
            <p className="mt-1 text-xs font-semibold text-body-text">
              Pace: {pace.displayLabel}
            </p>
          </div>

          {pace.coverageExpected !== null && (
            <div className="sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted">
                Covered / Expected
              </p>
              <p className="text-sm font-bold text-ink">
                {pace.coverageActual}% / {pace.coverageExpected}%
              </p>
            </div>
          )}
        </div>

        {pace.pausedReason && (
          <p className="mt-3 rounded-xl bg-tint px-3 py-2 text-xs font-medium text-body-text">
            {pace.pausedReason}
          </p>
        )}

        {syllabusCoverage.revisionFocusMessage && (
          <p className="mt-3 rounded-xl bg-tint px-3 py-2 text-xs font-medium text-body-text">
            {syllabusCoverage.revisionFocusMessage}
          </p>
        )}
      </StatCard>

    
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-[38fr_62fr]">
        {/* Syllabus coverage */}
        <StatCard className="flex h-full w-full min-w-0 flex-col" padding="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold leading-tight text-ink sm:text-[22px] sm:leading-none">
              {pace.displayLabel}
            </h2>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 sm:mt-8">
            <h3 className="text-[16px] font-semibold text-[#333333] dark:text-[var(--text-primary,#FAF7F2)] sm:text-[18px]">
              Syllabus Coverage
            </h3>

            <div className="ml-auto flex flex-col items-end gap-1">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.5 a15.5 15.5 0 1 1 0 31 a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="var(--tint-strong)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M18 2.5 a15.5 15.5 0 1 1 0 31 a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2.5"
                    strokeDasharray={`${syllabusCoverage.overall} 100`}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-ink">{syllabusCoverage.overall}%</span>
                </div>
              </div>

              <p className="text-right text-[10px] font-bold uppercase tracking-[0.5px] text-[#9CA3AF] dark:text-[#A0A0B0]">
                Overall Syllabus Covered
              </p>
            </div>
          </div>

          {syllabusCoverage.bySubject.length > 0 ? (
            <div className="mt-6 flex flex-col gap-5 sm:mt-8 sm:gap-6">
              {syllabusCoverage.bySubject.map((subject, index) => (
                <div key={subject.subjectId} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint-strong">
                    <span className="text-base font-bold text-ink">
                      {subjectInitial(subject.subjectName)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">
                        {subject.subjectName}
                      </span>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-ink">
                          {subject.coveragePercent}%
                        </span>
                        <span className="text-[11px] text-muted">
                          {subject.covered}/{subject.total}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className={`h-full rounded-full bg-[#312E81] ${SUBJECT_BARS[index % SUBJECT_BARS.length]}`}
                        style={{ width: `${subject.coveragePercent}%` }}
                      />
                    </div>

                    <p className="mt-2 text-[10px] text-muted">
                      {subject.mastered} mastered · {subject.total - subject.covered} left to cover
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>Pick your subjects in onboarding to track coverage.</EmptyNote>
          )}
        </StatCard>

      
        <StatCard
          className="flex h-full w-full min-w-0 flex-col"
          padding="p-4 sm:p-6"
          title="Precision Gap Analysis"
          titleClassName="font-sans text-base font-semibold! leading-none tracking-normal align-middle sm:text-lg"
          subtitle="Highest growth potential in these areas"
          subtitleClassName="font-(family-name:--font-inter) font-normal! leading-4 tracking-normal! align-middle text-[#9CA3AF] dark:text-[#A0A0B0]"
        >
          {data.top5WeakTopics.length > 0 ? (
            <>
              <PrecisionRankedList
                items={data.top5WeakTopics.map((topic) => ({
                  id: topic.chapterId,
                  rank: topic.rank,
                  title: topic.chapterName ?? "Unknown chapter",
                  subject: (topic.subjectName ?? "—").toUpperCase(),
                  weightage: topic.jeeWeightage ?? "—",
                  accuracy: accuracyLabel(topic.practiceAccuracy),
                }))}
              />

              <Link
                href="/home/focus-next"
                className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-bold text-ink"
              >
                View weak topics
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <EmptyNote>
              Weak topics surface once there is enough practice and revision data to be sure.
            </EmptyNote>
          )}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[329px_1fr]">
  
        <StatCard
          className="rounded-2xl border border-brand/10 bg-surface shadow-[0px_2px_8px_0px_rgba(26,26,78,0.08)] xl:h-[404px]"
          padding="p-4 sm:p-6"
        >
          {focusTopic ? (
            <>
              <div className="h-5 w-full">
                <span className="inline-flex h-5 w-[100px] items-center justify-center rounded bg-[#F59E0B] px-3 text-[10px] font-bold uppercase leading-[15px] tracking-normal text-white dark:bg-white dark:text-[#111145]">
                  Active Focus
                </span>
              </div>

              <div className="mt-6 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[1px] text-[#9CA3AF] dark:text-[#A0A0B0]">
                  {focusTopic.subjectName ?? "—"}
                </p>

                <h2 className="text-[18px] font-bold leading-6 text-ink sm:text-[20px] sm:leading-[27.5px]">
                  {focusTopic.chapterName ?? "Unknown chapter"}
                </h2>

                <p className="text-xs leading-4 text-muted">{focusTopic.rationale}</p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-2 sm:mt-8">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] dark:text-[#A0A0B0]">
                    Accuracy
                  </p>
                  <p className="mt-1 text-[24px] font-extrabold leading-8 text-ink sm:text-[30px] sm:leading-9">
                    {accuracyLabel(focusTopic.practiceAccuracy)}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase text-[#9CA3AF] dark:text-[#A0A0B0]">
                    JEE Weightage
                  </p>
                  <p className="mt-1 text-[24px] font-extrabold leading-8 text-ink sm:text-[30px] sm:leading-9">
                    {focusTopic.jeeWeightage ?? "—"}
                  </p>
                </div>
              </div>

              <Link href={`/home/focus-topic?chapterId=${focusTopic.chapterId}`} className="mt-6 block sm:mt-10">
                <Button
                  variant="task"
                  className="rounded-xl px-4 py-4 text-base !border-[#FF7A59] !bg-[#FF7A59] !text-[#FAF7F2] hover:!bg-[#FF7A59] hover:!text-[#FAF7F2] active:!bg-[#FF7A59] active:!text-[#FAF7F2]"
                >
                  Plan deep practice for this
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center">
              <EmptyNote>
                Your focus topic appears once your practice and revision data settles on one.
              </EmptyNote>
            </div>
          )}
        </StatCard>

        {/* JEE weightage breakdown */}
 
        <StatCard
          className="overflow-hidden rounded-2xl border border-brand/10 bg-surface xl:h-[404px]"
          padding="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-[23px]"
        >
          <div className="md:h-[39px]">
            <h2 className="text-[16px] font-bold leading-[22px] text-ink sm:text-[18px] sm:leading-[23px]">
              JEE Weightage Breakdown
            </h2>
            <p className="mt-1 text-[12px] leading-4 text-[#9CA3AF] dark:text-[#A0A0B0]">
              High weightage topics where you need to improve
            </p>
          </div>

          {data.weightageBreakdown.hasData ? (
            <div className="mt-4 sm:mt-5">
              {data.weightageBreakdown.rows.map((topic) => {
                const accuracy = topic.practiceAccuracy ?? 0;
                return (
                  <div
                    key={topic.chapterId}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-t border-brand/10 py-3 [grid-template-areas:'name_name_dots'_'subject_weight_weight'_'bar_bar_acc'] md:h-[54px] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_3.25rem_minmax(5rem,1.4fr)_auto] md:gap-y-0 md:py-0 md:[grid-template-areas:'name_subject_weight_acc_bar_dots']"
                  >
                    <p className="min-w-0 truncate text-[14px] font-bold leading-5 text-ink [grid-area:name]">
                      {topic.chapterName}
                    </p>

                    <p className="min-w-0 truncate text-[12px] font-medium leading-4 text-[#6B7280] [grid-area:subject] dark:text-[#A0A0B0] md:text-[14px] md:leading-5">
                      {topic.subjectName ?? "—"}
                    </p>

                    {/* "·" joins it to the subject on phones, where they share a line. */}
                    <p className="min-w-0 truncate text-[12px] font-medium leading-4 text-ink [grid-area:weight] before:mr-1.5 before:text-[#6B7280] before:content-['·'] md:text-[14px] md:leading-5 md:before:content-none">
                      {topic.jeeWeightage ?? "—"}
                    </p>

                    <p className="text-right text-[13px] font-bold leading-4 text-ink [grid-area:acc] md:text-[14px] md:font-medium md:leading-5">
                      {accuracyLabel(topic.practiceAccuracy)}
                    </p>

                    <div className="min-w-0 [grid-area:bar]">
                      <div className="h-[6px] rounded-full bg-ink/10">
                        <div
                          className="h-[6px] rounded-full bg-ink"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1 [grid-area:dots]">
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          className={`h-2.5 w-2.5 shrink-0 rounded-[5px] ${
                            dot <= topic.priorityRank ? "bg-[#FB923C]" : "bg-[#FB923C]/25"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyNote>
              Weightage priorities appear once weak topics have chapter weightage data.
            </EmptyNote>
          )}
        </StatCard>
      </div>

     
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
    
        <StatCard
          className="rounded-2xl border border-brand/10 bg-surface sm:h-[176px]"
          padding="p-4 sm:px-6 sm:pb-[44px] sm:pt-6"
        >
          <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:w-[233px] sm:shrink-0">
              <h2 className="text-[16px] font-bold leading-[22px] text-ink sm:text-[18px] sm:leading-[22.5px]">
                Mastery Timeline
              </h2>
              <p className="mt-1 text-[12px] leading-4 text-[#9CA3AF] dark:text-[#A0A0B0]">
                Chapter distribution across learning phases
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6 2xl:gap-8">
              {MASTERY_COLORS.map((item) => (
                <div key={item.key} className="flex min-w-0 flex-col items-center sm:min-w-[70px]">
                  <span
                    className="text-[20px] font-extrabold leading-7 sm:text-[24px] sm:leading-8"
                    style={{ color: item.text }}
                  >
                    {masteryCounts[item.key]}
                  </span>
                  <span className="mt-[2px] text-[10px] font-bold uppercase tracking-[0.5px] text-[#9CA3AF] dark:text-[#A0A0B0]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex h-[8px] w-full overflow-hidden rounded-full bg-ink/10">
            {MASTERY_COLORS.map((item) => (
              <div
                key={item.key}
                className={item.bar}
                style={{
                  width: `${((masteryCounts[item.key] ?? 0) / masteryDenominator) * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-[10px] font-medium text-muted">
              {masteryTimeline.touched} of {masteryTimeline.total} chapters started
            </span>
            <span className="text-[10px] font-medium text-muted">
              Goal: {masteryTimeline.total} chapters
            </span>
          </div>
        </StatCard>

     
        {/* Phones: one column, auto height. sm+: two columns, fixed 176px. */}
        <StatCard
          className="rounded-2xl border border-brand/10 bg-surface shadow-[0px_2px_8px_rgba(26,26,78,0.08)] sm:h-[176px]"
          padding="p-4 sm:p-6"
        >
          <div className="sm:h-[39px]">
            <h2 className="text-[16px] font-bold leading-[22px] text-ink sm:text-[18px] sm:leading-[22.5px]">
              Strongest Topics
            </h2>
            <p className="mt-[2px] text-[12px] leading-4 text-[#9CA3AF] dark:text-[#A0A0B0]">
              Topics you&apos;re performing best in
            </p>
          </div>

          {data.strongestTopics.hasData ? (
            <div className="mt-4 grid grid-cols-1 gap-y-3 sm:mt-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4 xl:gap-x-4">
         
              {[...data.strongestTopics.topics]
                .sort((a, b) => a.rank - b.rank)
                .slice(0, 4)
                .map((topic) => (
                <div key={topic.chapterId} className="flex h-6 min-w-0 items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-ink/10 text-[12px] font-bold text-ink">
                      {topic.rank}
                    </div>
                    <span
                      title={topic.chapterName}
                      className="truncate text-[12px] font-bold leading-4 text-ink sm:text-[11px] sm:leading-[16.5px]"
                    >
                      {topic.chapterName}
                    </span>
                  </div>

                  <span className="ml-2 shrink-0 text-[12px] font-bold leading-4 text-ink sm:ml-3">
                    {topic.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>{data.strongestTopics.emptyMessage}</EmptyNote>
          )}
        </StatCard>
      </div>
    </div>
  );
}
