"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CalendarIcon, ClockIcon, ArrowLeftIcon, BellIcon } from "@/assets/icons";
import { getJournalHistory, type JournalCard } from "@/lib/api/journal";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Dates arrive as date-only strings (`2026-05-12`); parsing them in UTC keeps
 *  a Monday from sliding into the previous Sunday west of Greenwich. */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRange(card: JournalCard): string {
  const start = parseDate(card.weekStart);
  const end = parseDate(card.weekEnd);
  if (!start || !end) return "—";
  const startLabel = `${SHORT_MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const endLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${end.getUTCDate()}`
      : `${SHORT_MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${startLabel} - ${endLabel}`;
}

/**
 * The badge and progress meter are read off the same hero tier the server
 * chose, so a card's headline in history matches the card itself.
 */
function deriveBadge(card: JournalCard): string {
  if (card.stats.isRecoveryWeek) return "Burnout Prevented";
  switch (card.hero.tier) {
    case 1:
      return "Consistency Milestone";
    case 2:
      return "Score Improved";
    case 3:
      return "Topics Mastered";
    case 4:
      return "Deep Work Week";
    case 5:
      return "Comeback Week";
    default:
      return "You Showed Up";
  }
}

function deriveProgress(card: JournalCard): { label: string; value: string; percent: number } {
  const activePercent = Math.round((card.stats.activeDays / 7) * 100);
  if (card.stats.isRecoveryWeek) {
    return { label: "Recovery Status", value: "Restored", percent: 100 };
  }
  if (card.hero.tier === 2 && card.stats.mockDelta !== null) {
    return { label: "Score Improvement", value: `+${card.stats.mockDelta} marks`, percent: activePercent };
  }
  return { label: "Consistency Goal", value: `${activePercent}%`, percent: activePercent };
}

function HistoryCard({ card }: { card: JournalCard }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const progress = deriveProgress(card);

  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex w-full flex-col gap-1 lg:max-w-[672px]">
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[9px] font-extrabold uppercase leading-[13.5px] tracking-[0.45px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
          >
            {deriveBadge(card)}
          </span>

          <p className="mt-1 text-[16px] font-extrabold leading-[24px] text-ink sm:text-[18px] sm:leading-[26px] lg:text-[20px] lg:leading-[28px]">
            {card.hero.title}
          </p>

          {card.hero.description && (
            <p className="text-[12px] leading-[18px] text-[#464650] sm:text-[13px] sm:leading-[20px] dark:text-[#8B8998]">
              {card.hero.description}
            </p>
          )}

          <div className="mt-2 flex w-full max-w-[320px] items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
            <span>{progress.label}</span>
            <span className="text-ink">{progress.value}</span>
          </div>
          <div
            className={`h-[6px] w-full max-w-[320px] rounded-full ${isDark ? "bg-white/15" : "bg-tint-strong"}`}
          >
            <div
              className={`h-full rounded-full ${isDark ? "bg-white" : "bg-brand"}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:w-[160px] lg:flex-col lg:items-end lg:justify-between lg:gap-[54px]">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted sm:text-xs [&>svg]:shrink-0">
            <CalendarIcon />
            <span className="truncate">{formatRange(card)}</span>
          </span>

          <Link
            href={`/home/journal?id=${card.id}`}
            className={`inline-flex h-12 w-full max-w-[160px] shrink items-center justify-center gap-3 whitespace-nowrap rounded-lg border px-4 text-[14px] font-bold text-ink transition-colors hover:bg-[#FF7A59] hover:text-white sm:w-[160px] sm:px-8 sm:text-[16px] ${isDark ? "border-white" : "border-brand"}`}
          >
            View Card
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WinJournalHistoryPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [cards, setCards] = useState<JournalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await getJournalHistory();
        if (!cancelled) setCards(data);
      } catch {
        if (!cancelled) setError("Could not load your Win Journal history. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The newest card is featured at the top and dropped from the month lists,
  // so it reads as "this week's win" rather than appearing twice.
  const [featured, ...rest] = cards;

  // Grouped newest-first. The API already sorts by week, so insertion order
  // into the Map is the display order.
  const byMonth = useMemo(() => {
    const groups = new Map<string, JournalCard[]>();
    for (const card of rest) {
      const start = parseDate(card.weekStart);
      const key = start ? `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}` : "Earlier";
      const bucket = groups.get(key);
      if (bucket) bucket.push(card);
      else groups.set(key, [card]);
    }
    return [...groups.entries()];
  }, [rest]);

  if (loading) return <PageLoader label="Loading your Win Journal history…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/journal" aria-label="Back to Weekly Win Journal" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight text-ink sm:text-h1 sm:leading-normal">
              Win Journal History
            </h1>
            <p className="flex items-center gap-1  text-[12px] font-medium leading-[18px] tracking-normal text-muted sm:text-[13px] sm:leading-5 md:text-[14px] md:leading-[21px]">
              <ClockIcon />
              {cards.length} {cards.length === 1 ? "week" : "weeks"} tracked
            </p>
          </div>
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

      {error && (
        <p className="rounded-xl bg-danger-bg p-4 text-sm font-medium text-danger">{error}</p>
      )}

      {!featured ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-6 text-center sm:p-8 lg:p-10">
          <h2 className="text-lg font-bold text-ink sm:text-xl">No cards yet</h2>
          <p className="max-w-md text-sm text-muted">
            Your first Win Journal lands this Friday evening. Every week you study gets its own
            card here.
          </p>
          <Button href="/home/journal" variant="secondary" className="mt-2">
            Back to Win Journal
          </Button>
        </div>
      ) : (
        <>
          {/* No `min-h`: the card grows with its own text. A fixed floor left a
              tall empty band under short hero copy, and the asymmetric
              pt-12/pb-10 only existed to centre content inside that floor. */}
          <div className="relative rounded-2xl border border-brand/10 bg-surface px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56   opacity-40" />

            <div className="relative flex h-full flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex w-full flex-col gap-3 sm:gap-4 lg:max-w-[568px]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
                  >
                    {deriveBadge(featured)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Latest Card &middot; {formatRange(featured)}
                  </span>
                </div>

                <h2 className="text-[22px] font-extrabold leading-tight text-ink sm:text-[26px] lg:text-[32px] lg:leading-none">
                  {featured.hero.title}
                </h2>

                <p className="max-w-[568px] text-[14px] leading-[22px] text-muted sm:text-[16px] sm:leading-[26px] lg:text-[18px] lg:leading-[29px]">
                  {featured.hero.description}
                </p>
              </div>

              <div className="flex w-full justify-start lg:w-auto lg:justify-end">
                <Button
                  href={`/home/journal?id=${featured.id}`}
                  variant="secondary"
                  className={`h-12 w-full rounded-xl px-6 text-[15px] font-bold hover:bg-[#FF7A59]! hover:text-white! sm:h-[52px] sm:w-[236px] sm:text-[16px] lg:h-[55px] lg:px-8 lg:text-[18px] ${isDark ? "" : "text-[#1A1A4E]!"}`}
                >
                  View Full Card
                </Button>
              </div>
            </div>
          </div>

          {byMonth.map(([month, monthCards]) => (
            <div key={month} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <p
                  className={`shrink-0 text-xs font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-muted"}`}
                >
                  {month}
                </p>
                <span className="h-px flex-1 bg-[#E1E3E4] dark:bg-[#FAF7F20F]" />
              </div>
              {monthCards.map((card) => (
                <HistoryCard key={card.id} card={card} />
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
