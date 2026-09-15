"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { BookOpenIcon, ChevronDownIcon } from "@/components/ui/icons";
import { getTop5WeakTopics, type WeakTopicSummary } from "@/lib/api/weakness";
import { TargetIcon } from "@/assets/icons";

function chapterHref(subjectName: string, chapterName: string) {
  const params = new URLSearchParams({ subject: subjectName, chapter: chapterName });
  return `/home/resource-library/chapter?${params.toString()}`;
}

/** Rows shown before "View N more" — the rest open in place below them. */
const VISIBLE_COUNT = 2;

/** "62% accuracy" from the API's number-or-numeric-string value; null when unmeasured. */
function accuracyLabel(value: WeakTopicSummary["practiceAccuracy"]): string | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}% accuracy` : null;
}

export function WeeklyTopChapters() {
  const [topics, setTopics] = useState<WeakTopicSummary[]>([]);
  const [isExpanded, setExpanded] = useState(false);
  const listId = useId();

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
    <section className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h2 className="font-sans text-[16px] font-bold uppercase leading-6 tracking-normal text-ink sm:text-[20px] sm:leading-7">
          Top This Week
        </h2>
        <p className="text-[12px] leading-4 text-muted sm:text-[14px] sm:leading-5">Curated for this week</p>
      </div>

      <ol id={listId} className="flex flex-col gap-3">
        {(isExpanded ? topics : topics.slice(0, VISIBLE_COUNT)).map((topic) => {
          const chapter = topic.chapter!;
          const subjectName = chapter.subject?.name ?? null;
  
          const details = [subjectName, topic.tierLabel, accuracyLabel(topic.practiceAccuracy)].filter(
            (detail): detail is string => Boolean(detail),
          );

          return (
            <li
              key={topic.chapterId}
              // Figma: 85px tall from sm, 16px padding and radius, space-between,
              // 3% shadow. Phones: 12px padding, auto height.
              className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-[0px_4px_20px_0px_#00000008] dark:bg-(--bg-card,#111145) sm:min-h-[85px] sm:gap-4 sm:p-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                {/* 48×48 tile with a 24px icon from sm; 40px / 20px on phones. */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0F8] text-ink dark:bg-(--border-card,#FAF7F214) sm:h-12 sm:w-12 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6">
                  <TargetIcon />
                </span>

                <div className="min-w-0">
                  <p
                    title={chapter.name}
                    // Up to 2 lines on phones — beside the tile and Open button a
                    // 320px screen leaves ~134px, so one line cut even short names.
                    className="line-clamp-2 break-words font-sans text-[15px] font-semibold leading-6 tracking-normal align-middle text-ink sm:line-clamp-1 sm:text-[20px] sm:leading-7"
                  >
                    {chapter.name}
                  </p>
                  {details.length > 0 && (
                    <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] leading-4 text-muted sm:text-[13px] sm:leading-5">
                      {/* Each dot travels with the item after it, so a line that
                          wraps on a phone never ends on a stray separator. */}
                      {details.map((detail, index) => (
                        <span key={detail} className="inline-flex min-w-0 items-center gap-2">
                          {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-muted/60" />}
                          <span className="truncate">{detail}</span>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </div>

              {/* Figma: 39px tall, 8px radius, 8/24 padding, medium 14/21 text. */}
              <Link
                href={chapterHref(subjectName ?? "", chapter.name)}
                aria-label={`Open ${chapter.name}`}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-cta px-4 font-sans text-[13px] font-medium leading-5 tracking-normal text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:h-[39px] sm:px-6 sm:text-[14px] sm:leading-[21px]"
              >
                Open
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Figma: medium 14/21, centred; 13/20 on phones. Opens the rest of the
          list in place, dropdown-style, and collapses it again. */}
      {topics.length > VISIBLE_COUNT && (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => setExpanded((expanded) => !expanded)}
          className="mx-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-[13px] font-medium leading-5 tracking-normal text-center align-middle text-ink transition-colors hover:bg-tint-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:text-[14px] sm:leading-[21px]"
        >
          {isExpanded
            ? "Show less"
            : `View ${topics.length - VISIBLE_COUNT} more ${topics.length - VISIBLE_COUNT === 1 ? "chapter" : "chapters"}`}
          <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </section>
  );
}
