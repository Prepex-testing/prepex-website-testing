"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { CalendarIcon, ClockIcon, TargetIcon, ArrowLeftIcon, BellIcon } from "@/assets/icons";
import { FileIcon, SparkleIcon, TrendingUpIcon } from "@/components/ui/icons";
import { getMockById, type MockAnalysisItem } from "@/lib/api/mock";
import type { ReactNode } from "react";
import { PercentileGauge } from "@/components/ui/PercentileGauge";
import { PageLoader } from "@/components/ui/PageLoader";

/** e.g. "20 Aug 2026, Thu" */
function formatTestDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} ${month} ${year}, ${weekday}`;
}

export default function ViewAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <ViewAnalyticsContent />
    </Suspense>
  );
}

function ViewAnalyticsContent() {
  const searchParams = useSearchParams();
  const mockId = searchParams.get("id");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [mock, setMock] = useState<MockAnalysisItem | null>(null);
  const [isLoading, setLoading] = useState(!!mockId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMockById(mockId)
      .then(({ data }) => {
        if (!cancelled) setMock(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this mock's analysis. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/home/mock-analysis" aria-label="Back to Mock Analysis" className="text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-h1 text-ink">View Analytics</h1>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
        >
          <BellIcon />
        </button>
        <UserMenu />
      </div>
    </div>
  );

  if (!mockId) {
    return (
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
        {header}
        <p className="text-sm text-muted">
          No mock selected. Go back to{" "}
          <Link href="/home/mock-analysis" className="font-semibold text-cta">
            Mock Analysis
          </Link>{" "}
          and pick one to view.
        </p>
      </div>
    );
  }

  // Whole page waits on the fetch — no partial chrome before the data is in.
  if (isLoading) {
    return <PageLoader label="Loading analysis…" />;
  }

  if (error || !mock) {
    return (
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
        {header}
        <p className="py-8 text-center text-sm text-warning">
          {error ?? "Couldn't load this mock's analysis."}
        </p>
      </div>
    );
  }

  const subtitleParts = [mock.sourceInstitute, mock.examType].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Mock Test";

  const headerStats: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <CalendarIcon />, label: "Test Date", value: formatTestDate(mock.attemptedDate) },
    {
      icon: <ClockIcon />,
      label: "Duration",
      value: mock.testDurationMinutes ? `${mock.testDurationMinutes} min` : "—",
    },
    { icon: <FileIcon />, label: "Total Marks", value: mock.maxScore != null ? String(mock.maxScore) : "—" },
  ];

  const hasScore = mock.totalScore != null && mock.maxScore != null;
  const accuracyPercent = Math.round(Number(mock.accuracyPercentage)) || 0;

  const subjectPerformance = mock.subjectAnalysis.map((subject) => ({
    id: subject.id,
    label: subject.subject.name,
    score: subject.score,
    maxScore: subject.maxScore,
    percent: Math.round(Number(subject.accuracyPercentage)) || 0,
  }));

  const subjectTestStrategy = mock.subjectAnalysis
    .filter((subject) => subject.timeTakenMinutes != null || subject.testDurationMinutes != null)
    .map((subject) => ({
      id: subject.id,
      label: subject.subject.name,
      timeTakenMinutes: subject.timeTakenMinutes,
      testDurationMinutes: subject.testDurationMinutes,
    }));
  const maxSubjectTime = Math.max(1, ...subjectTestStrategy.map((s) => s.timeTakenMinutes ?? 0));
  const hasMissingSubjectTime =
    mock.subjectAnalysis.length === 0 ||
    mock.subjectAnalysis.some((subject) => subject.timeTakenMinutes == null);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      {header}

      {!hasScore && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-tint-strong px-6 py-4">
          <p className="text-sm text-ink">
            This mock hasn&apos;t been scored yet — add your score to see the full analysis.
          </p>
          <Button href={`/home/mock-analysis/upload-scorecard?id=${mock.id}`} variant="secondary" size="sm">
            Upload Score
          </Button>
        </div>
      )}

      {/* Mock summary card */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-brand/10 bg-surface px-[24px] pt-[32px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] dark:bg-[#FAF7F2]/8 dark:border-[#FAF7F2] text-ink [&>svg]:h-6 [&>svg]:w-6"
          >
            <TargetIcon />
          </div>

          <div>
            <h2 className="text-[18px] font-bold leading-[28px] text-ink">{mock.mockName}</h2>
            <p className="text-[14px] font-medium leading-[20px] text-muted">{subtitle}</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap gap-4 sm:gap-[64px]">
          {headerStats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span
                className="text-[14px] font-medium leading-[20px] text-muted"
                style={isDark ? { color: "var(--ink)" } : undefined}
              >
                {stat.label}
              </span>
              <div className="mt-[4px] flex items-center gap-[6px]">
                <span
                  className="flex h-4 w-4 items-center justify-center text-ink [&>svg]:h-4 [&>svg]:w-4"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.icon}
                </span>
                <span
                  className="text-[16px] font-bold leading-[24px] text-ink whitespace-nowrap"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
        {/* Total Score Card */}
        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] pt-[28px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <p className="text-[18px] font-bold uppercase leading-[28px] tracking-[0.5px] text-muted">
            Total Score
          </p>

          <div className="mt-3 flex items-end justify-center">
            <span className="text-[68px] font-extrabold leading-none text-ink">
              {mock.totalScore ?? "—"}
            </span>
            <span className="mb-[5px] text-[40px] font-bold leading-none text-muted/50">
              /{mock.maxScore ?? "—"}
            </span>
          </div>

          <div
            className={`mt-6 flex w-full items-center gap-4 rounded-[16px] px-5 py-3 ${isDark ? "" : "bg-success-bg"}`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-success/20">
              <span className="text-success [&>svg]:h-6 [&>svg]:w-6">
                <TrendingUpIcon />
              </span>
            </div>
            <div>
              <p className="text-[18px] font-bold leading-[24px] text-success">
                ↑ 12 Marks
              </p>
              <p className="text-[16px] leading-[20px] text-muted">
                vs last mock
              </p>
            </div>
          </div>
        </div>

        {/* Accuracy Card */}
        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] py-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <CircularProgress
            percent={accuracyPercent}
            size={140}
            trackColor="var(--tint-strong)"
            progressColor={isDark ? "var(--ink)" : undefined}
            progressGradient={
              isDark ? undefined : { from: "#1A1A4E", to: "#4C1D95" }
            }
          />
          <p className="mt-5 text-[16px] font-semibold leading-none text-muted">
            Percentile
          </p>
        </div>

        {/* Percentile Card */}
        {/* <div className="flex flex-col items-center justify-center rounded-[16px] border border-brand/10 bg-surface px-8 py-7 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <PercentileGauge
            value={82}
            size={250}
            showLabel={false}
            progressColor={isDark ? "#4C1D95" : undefined}
          />
          <p className="-mt-3 text-[16px] font-semibold text-muted">
            Percentile
          </p>
        </div> */}
      </div>

      {/* Subject Performance + Subject-wise Test Strategy */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Subject Performance */}
        {subjectPerformance.length > 0 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
              Subject Performance
            </p>

            <div className="flex flex-col gap-4">
              {subjectPerformance.map((subject) => (
                <div
                  key={subject.id}
                  className="flex flex-col gap-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    {subject.label}
                  </span>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      <span className="text-ink">
                        {subject.score}
                      </span>
                      <span className="text-muted/50">
                        /{subject.maxScore}
                      </span>
                    </span>

                    <span className="flex items-center gap-1 font-bold text-ink">
                      <span>{subject.percent}%</span>
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-tint-strong">
                    <div
                      className="h-1.5 rounded-full bg-brand dark:bg-[#FAF7F2]"
                      style={{
                        width: `${subject.percent}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        {/* <motion.div
        {...fadeIn}
        transition={{ ...fadeTransition, delay: 0.22 }}
        className="flex items-start gap-4 rounded-2xl border border-brand/20 bg-surface p-6"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8">
          <SparkleIcon />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-ink">AI Insight</p>
          <p
            className="mt-1 text-[18px] leading-6 text-body-text"
            style={{ color: isDark ? "var(--muted)" : "#374151" }}
          >
            Insight detected: You spent <strong className="font-bold">90 min</strong> on{" "}
            <strong className="font-bold">Maths</strong> (your middle subject), leaving only{" "}
            <strong className="font-bold">45 min</strong> for{" "}
            <strong className="font-bold">Chemistry</strong>. <br />Your{" "}
            <strong className="font-bold">12 &lsquo;Time Pressure&rsquo; errors</strong> were all
            in Chemistry.
          </p>
        </div>
      </motion.div> */}

        {/* Subject-wise Test Strategy */}
        {subjectTestStrategy.length > 0 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
              Subject-wise Test Strategy
            </p>

            <div className="flex flex-col gap-4">
              {subjectTestStrategy.map((subject, index) => {
                const percent =
                  subject.timeTakenMinutes != null
                    ? Math.round(
                      (subject.timeTakenMinutes / maxSubjectTime) * 100,
                    )
                    : 0;

                return (
                  <div
                    key={subject.id}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white dark:text-background"
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">
                          {subject.label}
                        </span>

                        <span className="shrink-0 text-right leading-tight">
                          <span className="block text-xs font-bold text-ink">
                            {subject.timeTakenMinutes != null
                              ? `${subject.timeTakenMinutes} min`
                              : "—"}
                          </span>

                          {subject.testDurationMinutes != null && (
                            <span className="block text-[11px] text-muted">
                              of {subject.testDurationMinutes} min
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                        <div
                          className="h-1.5 rounded-full bg-brand"
                          style={{
                            width: `${percent}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strategy Note */}
            <div
              className={`w-full max-w-[320px] rounded-lg border p-4 ${isDark
                ? "border-brand/10 bg-[var(--sub)]"
                : "border-brand/10 bg-tint-strong"
                }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-ink">
                Strategy Note
              </p>

              <p className="mt-2 leading-5 text-link">
                Excessive time in Maths impacted Chemistry quality. Rebalance next
                time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Update Score Details Button */}
      {hasMissingSubjectTime && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button href={`/home/mock-analysis/upload-scorecard?id=${mock.id}`} variant="primary">
            Update score details
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="rounded-sm bg-[#1A1A4E] py-3 text-center text-[16px] font-semibold leading-none text-white">
        Mock scores never visible to partner.
      </div>
    </div>
  );
}