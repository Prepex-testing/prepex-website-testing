"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AlertTriangleIcon, ChevronRightIcon } from "@/components/ui/icons";
import { ClockIcon, CalendarIcon, FileIcon, BellIcon } from "@/assets/icons";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  getMistakePatterns,
  listDueMistakeGroups,
  listMistakes,
  MISTAKE_TAG_LABELS,
  startMistakeSession,
  type DueMistakeGroup,
  type DueMistakeGroupsResponse,
  type MistakeListItem,
  type MistakePatternsResponse,
  type MistakeTag,
  type MistakeTagFilter,
} from "@/lib/api/practice";

const TODAY_PAGE_SIZE = 5;
const OVERDUE_PAGE_SIZE = 10;

const TAG_STYLES: Record<MistakeTag, string> = {
  CONCEPTUAL_GAP: "bg-tint text-ink",
  SILLY_ERROR: "bg-cta/10 text-cta",
  TIME_PRESSURE: "bg-warning/10 text-warning",
  WILD_GUESS: "bg-info-bg text-info",
};

const TAG_FILTER_LABELS: Record<MistakeTagFilter, string> = {
  ...MISTAKE_TAG_LABELS,
  UNTAGGED: "Untagged",
};

const TYPE_FILTERS: ("All" | MistakeTagFilter)[] = [
  "All",
  "SILLY_ERROR",
  "CONCEPTUAL_GAP",
  "TIME_PRESSURE",
  "WILD_GUESS",
  "UNTAGGED",
];

function DueTagRow({ group, showDate }: { group: DueMistakeGroup; showDate?: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subjectLetter = group.subjectName.charAt(0).toUpperCase() || "?";
  const n = group.count;
  const dueOn = new Date(group.oldestDue).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setErr(null);
    try {
      const { data } = await startMistakeSession(group.chapterId, group.tag);
      router.push(`/practice?sessionId=${data.sessionId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start practice.");
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-brand/10 p-5 sm:flex-row sm:items-center">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tint text-2xl font-black text-ink">
        {subjectLetter}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold leading-6 text-ink">
            {group.subjectName ? `${group.subjectName} · ` : ""}
            {group.chapterName}
          </span>
          {/* No chip at all until the entries carry a tag — an untagged group
              is just "this chapter's mistakes", with nothing to label. */}
          {group.tag && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.25px] ${TAG_STYLES[group.tag]}`}
            >
              {MISTAKE_TAG_LABELS[group.tag]}
            </span>
          )}
          <span className="rounded-full bg-tint-strong px-2 py-0.5 text-[11px] font-bold text-ink">
            {n} question{n === 1 ? "" : "s"}
          </span>
          {showDate && (
            <span className="rounded-full bg-[rgba(245,158,11,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.25px] text-[#F59E0B]">
              Due {dueOn}
            </span>
          )}
        </p>
        <p className="truncate text-[13px] font-medium text-muted">
          {group.topics.slice(0, 4).join(" · ")}
        </p>
        {err && <p className="text-[12px] font-semibold text-danger">{err}</p>}
      </div>

      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--button-border)] bg-surface px-4 text-[14px] font-semibold text-body-text transition-colors hover:border-[#FF7A59] hover:bg-[#FF7A59] hover:text-white disabled:opacity-50"
      >
        {starting ? "Starting…" : "Start Practice"}
      </button>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  shown,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  onPage: (next: number) => void;
}) {
  const arrowBtn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="mt-4 flex min-h-[68px] flex-col items-center justify-center gap-3 border-t border-brand/10 pt-4 md:relative md:flex-row md:justify-center">
      <p className="text-center text-caption leading-4 text-muted">
        Showing {shown} of {total} mistakes
      </p>

      <div className="flex items-center justify-center gap-3 md:absolute md:right-0">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className={arrowBtn}
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>

        <span className="whitespace-nowrap text-caption font-semibold text-ink">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={arrowBtn}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

export default function MistakeNotebookPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Full ACTIVE list — used only to populate the subject filter chips and the
  // header "N entries" count. The row lists come from the paginated endpoint.
  const [allItems, setAllItems] = useState<MistakeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [patterns, setPatterns] = useState<MistakePatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"All" | MistakeTagFilter>("All");

  const [today, setToday] = useState<DueMistakeGroupsResponse | null>(null);
  const [todayPage, setTodayPage] = useState(1);
  const [overdue, setOverdue] = useState<DueMistakeGroupsResponse | null>(null);
  const [overduePage, setOverduePage] = useState(1);

  const subjectNameToId = useMemo(() => {
    const m = new Map<string, number>();
    allItems.forEach((i) => {
      if (i.chapter?.subject) m.set(i.chapter.subject.name, i.chapter.subject.id);
    });
    return m;
  }, [allItems]);

  const subjects = useMemo(
    () => ["All", ...[...subjectNameToId.keys()].sort()],
    [subjectNameToId],
  );

  const tag = typeFilter === "All" ? undefined : typeFilter;
  const subjectId = subjectFilter === "All" ? undefined : subjectNameToId.get(subjectFilter);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [list, pat] = await Promise.all([
          listMistakes({ status: "ACTIVE", limit: 50 }),
          getMistakePatterns(),
        ]);
        if (cancelled) return;
        setAllItems(list.data.items);
        setTotal(list.data.total);
        setPatterns(pat.data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not load your notebook.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await listDueMistakeGroups({
          bucket: "today",
          page: todayPage,
          limit: TODAY_PAGE_SIZE,
          tag,
          subjectId,
        });
        if (!cancelled) setToday(data);
      } catch {
        // Keep the previous page's rows on a transient failure.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [todayPage, tag, subjectId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await listDueMistakeGroups({
          bucket: "overdue",
          page: overduePage,
          limit: OVERDUE_PAGE_SIZE,
          tag,
          subjectId,
        });
        if (!cancelled) setOverdue(data);
      } catch {
        // Keep the previous page's rows on a transient failure.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [overduePage, tag, subjectId]);

  // Any filter change restarts both lists from page 1.
  const applySubjectFilter = (value: string) => {
    setSubjectFilter(value);
    setTodayPage(1);
    setOverduePage(1);
  };
  const applyTypeFilter = (value: "All" | MistakeTagFilter) => {
    setTypeFilter(value);
    setTodayPage(1);
    setOverduePage(1);
  };
  const clearFilters = () => {
    setSubjectFilter("All");
    setTypeFilter("All");
    setTodayPage(1);
    setOverduePage(1);
  };

  const dueTodayCount = today?.entryCount ?? 0;

  if (loading) return <PageLoader label="Loading your notebook…" />;

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
              {dueTodayCount} due for review today
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
            onClick={clearFilters}
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
                  onClick={() => applySubjectFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all duration-300 ${subjectFilter === item
                    ? "border-brand bg-brand text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
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
                  onClick={() => applyTypeFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all duration-300 ${typeFilter === item
                    ? "border-brand bg-brand text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
                    : isDark
                      ? "border-muted bg-transparent text-white hover:bg-tint"
                      : "border-brand bg-transparent text-ink hover:bg-tint"
                    }`}
                >
                  {item === "All" ? "All" : TAG_FILTER_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase leading-4 tracking-[1.2px] text-[#F59E0B]">
          <ClockIcon />
          Due Today <span className="normal-case text-muted">({today?.total ?? 0})</span>
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {!today || today.groups.length === 0 ? (
            <div className="flex min-h-[120px] w-full items-center justify-center rounded-xl border border-brand/10 bg-surface px-4 py-6">
              <p className="text-center text-sm font-medium text-muted">
                Nothing due today. 🎉
              </p>
            </div>
          ) : (
            today.groups.map((group) => (
              <DueTagRow key={group.key} group={group} />
            ))
          )}
        </div>
        {today && (
          <Pager
            page={today.page}
            totalPages={today.totalPages}
            shown={today.groups.length}
            total={today.total}
            onPage={setTodayPage}
          />
        )}
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase leading-4 tracking-[1.2px] text-[#F59E0B]">
          <CalendarIcon />
          All Due <span className="normal-case text-muted">({overdue?.total ?? 0})</span>
        </p>
        <p className="mt-1 text-[12px] text-muted">
          Mistake practices that fell due before today — oldest first.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {!overdue || overdue.groups.length === 0 ? (
            <div className="flex min-h-[120px] w-full items-center justify-center rounded-xl border border-brand/10 bg-surface px-4 py-6">
              <p className="text-center text-sm font-medium text-muted">
                Nothing overdue. You&apos;re caught up.
              </p>
            </div>
          ) : (
            overdue.groups.map((group) => (
              <DueTagRow key={group.key} group={group} showDate />
            ))
          )}
        </div>
        {overdue && (
          <Pager
            page={overdue.page}
            totalPages={overdue.totalPages}
            shown={overdue.groups.length}
            total={overdue.total}
            onPage={setOverduePage}
          />
        )}
      </div>
    </div>
  );
}
