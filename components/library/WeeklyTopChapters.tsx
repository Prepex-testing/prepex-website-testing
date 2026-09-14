"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { getTop5WeakTopics, type WeakTopicSummary } from "@/lib/api/weakness";

function chapterHref(subjectName: string, chapterName: string) {
  const params = new URLSearchParams({ subject: subjectName, chapter: chapterName });
  return `/home/resource-library/chapter?${params.toString()}`;
}

/**
 * "Top 5 This Week" on the Library — the student's five weakest chapters
 * (same ranking as Focus Next), each opening its resources. The section is
 * extra guidance on top of the chapter list, so it stays out of the way: it
 * renders nothing while loading, on failure, or before there's enough data.
 */
export function WeeklyTopChapters() {
  const [topics, setTopics] = useState<WeakTopicSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTop5WeakTopics()
      .then(({ topics: list }) => {
        if (!cancelled) setTopics(list.filter((topic) => topic.chapter).slice(0, 5));
      })
      .catch(() => {
        // Best-effort — the library itself doesn't depend on this.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (topics.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-[24px] border border-brand/10 bg-surface px-4 py-4 shadow-sm sm:px-6 sm:py-5 lg:px-8 dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]">
      <div>
        <h2 className="text-[17px] font-bold leading-6 text-ink sm:text-[20px] sm:leading-7">
          Top 5 This Week
        </h2>
        <p className="text-[13px] leading-5 text-muted sm:text-sm">Curated for this week</p>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {topics.map((topic, index) => {
          const chapter = topic.chapter!;
          return (
            <li key={topic.chapterId} className="min-w-0">
              <Link
                href={chapterHref(chapter.subject?.name ?? "", chapter.name)}
                className="flex h-full items-start gap-3 rounded-2xl border border-brand/5 bg-surface px-4 py-3.5 shadow-sm transition-colors hover:border-brand/20"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-strong text-[13px] font-bold text-ink">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">
                    {chapter.subject?.name ?? "Chapter"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[14px] font-bold leading-5 text-ink">
                    {chapter.name}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-muted">{topic.tierLabel}</p>
                </div>
                <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
