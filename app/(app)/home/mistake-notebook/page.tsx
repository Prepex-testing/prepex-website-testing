"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { ClockIcon, CalendarIcon, FileIcon, BellIcon } from "@/assets/icons";
import {
  getMistakePatterns,
  listMistakes,
  MISTAKE_TAG_LABELS,
  startMistakeSession,
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

type DueTagGroup = {
  key: string;
  chapterId: string;
  chapterName: string;
  subjectName: string;
  tag: MistakeTag | null;
  entries: MistakeListItem[];
  /** Earliest nextReviewDate in the group — shown in the "All Due" list. */
  oldestDue: string;
};

function DueTagRow({ group, showDate }: { group: DueTagGroup; showDate?: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subjectLetter = group.subjectName.charAt(0).toUpperCase() || "?";
  const n = group.entries.length;
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
      const { data } = await startMistakeSession(group.chapterId, group.tag ?? undefined);
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
          {group.tag ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.25px] ${TAG_STYLES[group.tag]}`}
            >
              {MISTAKE_TAG_LABELS[group.tag]}
            </span>
          ) : (
            <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.25px] text-muted">
              Untagged
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
          {group.entries
            .map((e) => e.topic)
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 4)
            .join(" · ")}
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Reviews scheduled for today vs everything already overdue from before today.
  const dueToday = filtered.filter((i) => {
    const t = new Date(i.nextReviewDate).getTime();
    return t >= startOfToday.getTime() && t <= endOfToday.getTime();
  });
  const pastDue = filtered.filter(
    (i) => new Date(i.nextReviewDate).getTime() < startOfToday.getTime(),
  );

  // chapter+tag grouping — one "Start Practice" row per tag; a multi-tagged
  // mistake appears under each of its tags. `oldestDue` drives the date shown
  // in the "All Due" section.
  const groupByChapterTag = (list: MistakeListItem[]): DueTagGroup[] => {
    const map = new Map<string, DueTagGroup>();
    for (const e of list) {
      const tags: (MistakeTag | null)[] = e.mistakeTags.length ? e.mistakeTags : [null];
      for (const tag of tags) {
        const key = `${e.chapterId}::${tag ?? "_"}`;
        const g = map.get(key) ?? {
          key,
          chapterId: e.chapterId,
          chapterName: e.chapter?.name ?? e.topic,
          subjectName: e.chapter?.subject?.name ?? "",
          tag,
          entries: [],
          oldestDue: e.nextReviewDate,
        };
        g.entries.push(e);
        if (new Date(e.nextReviewDate) < new Date(g.oldestDue)) g.oldestDue = e.nextReviewDate;
        map.set(key, g);
      }
    }
    return [...map.values()];
  };

  const dueGroups = groupByChapterTag(dueToday);
  const pastDueGroups = groupByChapterTag(pastDue).sort(
    (a, b) => new Date(a.oldestDue).getTime() - new Date(b.oldestDue).getTime(),
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
              {dueGroups.length === 0 ? (
                <p className="text-sm text-muted">Nothing due today. 🎉</p>
              ) : (
                dueGroups.map((group) => (
                  <DueTagRow key={group.key} group={group} />
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-6">
            <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase leading-4 tracking-[1.2px] text-[#F59E0B]">
              <CalendarIcon />
              All Due <span className="normal-case text-muted">({pastDueGroups.length})</span>
            </p>
            <p className="mt-1 text-[12px] text-muted">
              Mistake practices that fell due before today — oldest first.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              {pastDueGroups.length === 0 ? (
                <p className="text-sm text-muted">Nothing overdue. You&apos;re caught up.</p>
              ) : (
                pastDueGroups.map((group) => (
                  <DueTagRow key={group.key} group={group} showDate />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
