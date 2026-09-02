"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { ClockIcon, CalendarIcon, FileIcon, BellIcon } from "@/assets/icons";
import {
  getMistakePatterns,
  listMistakes,
  MISTAKE_TAG_LABELS,
  type MistakeListItem,
  type MistakePatternsResponse,
  type MistakeTag,
} from "@/lib/api/practice";

const TAG_STYLES: Record<MistakeTag, string> = {
  CONCEPTUAL_GAP: "bg-tint text-ink",
  SILLY_ERROR: "bg-cta/10 text-cta",
  TIME_PRESSURE: "bg-warning/10 text-warning",
  WILD_GUESS: "bg-info-bg text-info",
};

const TYPE_FILTERS: ("All" | MistakeTag)[] = [
  "All",
  "SILLY_ERROR",
  "CONCEPTUAL_GAP",
  "TIME_PRESSURE",
  "WILD_GUESS",
];

function daysAgo(iso: string | null): string {
  if (!iso) return "Not reviewed yet";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff <= 0) return "Reviewed today";
  return `Last reviewed: ${diff} day${diff === 1 ? "" : "s"} ago`;
}

function dueLabel(iso: string): { due: boolean; text: string } {
  const target = new Date(iso).getTime();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (target <= endOfToday.getTime()) return { due: true, text: "Due now" };
  const days = Math.ceil((target - Date.now()) / 86_400_000);
  return { due: false, text: `Due in ${days} day${days === 1 ? "" : "s"}` };
}

function MistakeRow({ entry }: { entry: MistakeListItem }) {
  const subjectName = entry.chapter?.subject?.name ?? "";
  const subjectLetter = subjectName.charAt(0).toUpperCase() || "?";
  const chapterName = entry.chapter?.name ?? entry.topic;
  const primaryTag = entry.mistakeTags[0];
  const { due, text } = dueLabel(entry.nextReviewDate);

  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 p-5 sm:flex-row sm:items-center">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tint text-2xl font-black text-ink">
        {subjectLetter}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold leading-6 text-ink">
            {chapterName} · {entry.topic}
          </span>
          {primaryTag && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.25px] ${TAG_STYLES[primaryTag]}`}
            >
              {MISTAKE_TAG_LABELS[primaryTag]}
            </span>
          )}
          <span className="text-[11px] font-medium leading-[16.5px] text-muted/70">
            {daysAgo(entry.lastReviewedAt)}
          </span>
        </p>
        <p className="text-[14px] font-medium italic leading-5 text-muted">
          {entry.studentNote ? `“${entry.studentNote}”` : entry.question?.questionText ?? ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 pl-[76px] sm:pl-0">
        {!due && (
          <span className="rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            {text}
          </span>
        )}
        <Link
          href={`/home/mistake-notebook/entry?id=${entry.id}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--button-border)] bg-surface px-4 text-[14px] font-semibold text-body-text transition-colors hover:border-[#FF7A59] hover:bg-[#FF7A59] hover:text-white"
        >
          {due ? "Review now" : "Open"}
        </Link>
      </div>
    </div>
  );
}

export default function MistakeNotebookPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [items, setItems] = useState<MistakeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [patterns, setPatterns] = useState<MistakePatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"All" | MistakeTag>("All");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMistakes({ status: "ACTIVE", limit: 50 }), getMistakePatterns()])
      .then(([list, pat]) => {
        if (cancelled) return;
        setItems(list.data.items);
        setTotal(list.data.total);
        setPatterns(pat.data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load your notebook.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.chapter?.subject?.name && set.add(i.chapter.subject.name));
    return ["All", ...[...set].sort()];
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (subjectFilter !== "All" && i.chapter?.subject?.name !== subjectFilter) return false;
        if (typeFilter !== "All" && !i.mistakeTags.includes(typeFilter)) return false;
        return true;
      }),
    [items, subjectFilter, typeFilter],
  );

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const dueToday = filtered.filter(
    (i) => new Date(i.nextReviewDate).getTime() <= endOfToday.getTime(),
  );
  const upcoming = filtered.filter(
    (i) => new Date(i.nextReviewDate).getTime() > endOfToday.getTime(),
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Mistake Notebook</h1>
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

      <div className="flex min-h-[112px] w-full items-center gap-6 rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-icon-chip-bg text-ink shadow-sm dark:bg-[#FAF7F2]/8 [&>svg]:h-6 [&>svg]:w-auto">
          <FileIcon />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-[22px] font-bold leading-[100%] text-ink">Mistake Notebook</h2>
          <div className="flex flex-wrap items-center gap-2 text-[14px] leading-5">
            <span className="font-medium text-muted">{total} entries</span>
            <span className="text-muted">•</span>
            <span className="font-bold text-[#F59E0B] underline decoration-[#FED7AA] decoration-[2px] underline-offset-2">
              {dueToday.length} due for review today
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm text-warning">
          {error}
        </p>
      )}

      {/* Pattern recognition (PRD 5.7) */}
      {patterns && patterns.patterns.length > 0 && (
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[1.2px] text-[#F59E0B]">
              <AlertTriangleIcon /> Mistake Patterns · Last {patterns.windowDays} Days
            </p>
            <span className="text-[12px] font-semibold text-muted">
              ~{patterns.totalMarksLost} marks lost
            </span>
          </div>

          {!patterns.qualifiesForInsight && (
            <p className="mt-2 text-[12px] text-muted">
              Patterns sharpen after {patterns.minEntriesForInsight} tagged mistakes — {patterns.totalEntries} so far.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {patterns.patterns.map((p) => (
              <div key={p.tag} className="rounded-xl border border-brand/10 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[15px] font-bold text-ink">
                    {p.label}: <span className="text-[#F59E0B]">{p.marksLost} marks lost</span>
                  </p>
                  <span className="text-[12px] text-muted">
                    {p.count} question{p.count === 1 ? "" : "s"}
                    {p.topChapterName ? `, mostly ${p.topChapterName}` : ""}
                  </span>
                </div>
                {p.suggestedAction && (
                  <p className="mt-1 text-[13px] text-body-text">
                    <span className="font-semibold">Action:</span> {p.suggestedAction}
                  </p>
                )}
              </div>
            ))}
          </div>

          {patterns.insight && (
            <p className="mt-4 border-t border-brand/10 pt-4 text-[13px] leading-5 text-body-text">
              <span className="font-bold">Insight:</span> {patterns.insight}
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="w-full rounded-2xl border border-brand/10 bg-surface px-6 pt-[17px] pb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold uppercase tracking-[0.7px]">Filters</p>
          <button
            type="button"
            onClick={() => {
              setSubjectFilter("All");
              setTypeFilter("All");
            }}
            className="text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="flex w-full max-w-[355px] flex-col gap-3">
            <p className="text-sm font-bold uppercase text-ink">Subject</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((item) => (
                <button
                  key={item}
                  onClick={() => setSubjectFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all ${
                    subjectFilter === item
                      ? "border-brand bg-brand text-white"
                      : isDark
                        ? "border-muted bg-transparent text-white hover:bg-tint"
                        : "border-brand bg-transparent text-ink hover:bg-tint"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            <p className="text-sm font-bold uppercase text-ink">Mistake Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setTypeFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all ${
                    typeFilter === item
                      ? "border-brand bg-brand text-white"
                      : isDark
                        ? "border-muted bg-transparent text-white hover:bg-tint"
                        : "border-brand bg-transparent text-ink hover:bg-tint"
                  }`}
                >
                  {item === "All" ? "All" : MISTAKE_TAG_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading your notebook…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-brand/10 bg-surface p-6">
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase leading-4 tracking-[1.2px] text-[#F59E0B]">
              <ClockIcon />
              Due Today <span className="normal-case text-muted">({dueToday.length})</span>
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {dueToday.length === 0 ? (
                <p className="text-sm text-muted">Nothing due today. 🎉</p>
              ) : (
                dueToday.map((entry) => <MistakeRow key={entry.id} entry={entry} />)
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <CalendarIcon />
              Upcoming <span className="font-normal">({upcoming.length})</span>
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted">No upcoming reviews.</p>
              ) : (
                upcoming.map((entry) => <MistakeRow key={entry.id} entry={entry} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
