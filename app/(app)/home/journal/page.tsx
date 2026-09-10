"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { Logo, Logo2 } from "@/components/ui/Logo";
import { PageLoader } from "@/components/ui/PageLoader";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { CopyIcon, DownloadIcon, WhatsAppIcon } from "@/components/ui/icons";
import {
  FlameIcon,
  TrendingUpIcon,
  ClockIcon,
  LayersIcon,
  Check,
  TrophyIcons,
  TargetIcon,
  ArrowLeftIcon,
  } from "@/assets/icons";
import {
  getLatestJournal,
  getJournalById,
  generateJournal,
  markJournalViewed,
  journalImageUrl,
  journalShareUrl,
  type JournalCard,
} from "@/lib/api/journal";
import {
  buildShareText,
  copyShareLink,
  downloadCard,
  shareToWhatsApp,
  type ShareOutcome,
} from "@/lib/share/journalShare";

// The greeting mirrors the hero tier the server picked, so the card on screen
// reads the same as the PNG a student shares.
const HERO_GREETING: Record<number, (name: string) => string> = {
  1: (n) => `${n}, you built a streak.`,
  2: (n) => `${n}, your score climbed.`,
  3: (n) => `${n}, you leveled up.`,
  4: (n) => `${n}, you put in the work.`,
  5: (n) => `${n}, you came through.`,
  6: (n) => `${n}, you showed up.`,
};

function PageHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/home" aria-label="Back to Home" className="text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-h1 text-ink">Weekly Win Journal</h1>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  text,
  caption,
}: {
  icon: React.ReactNode;
  text: string;
  caption?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#FAF7F214] bg-white/[0.03] p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#13133D] p-3 text-[#FAF7F2] [&>svg]:h-[18.75px] [&>svg]:w-auto">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold text-[#FAF7F2]">{text}</p>
        {caption && (
          <p className="mt-1 text-[10px] font-medium leading-[12px] tracking-normal text-[#8B8998] sm:text-[11px] sm:leading-[13.2px]">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

function WeeklyWinJournalContent() {
  const searchParams = useSearchParams();
  const storedFullName = useStoredFullName();
  const firstName = storedFullName.trim().split(/\s+/)[0] || "You";
  // History links here with ?id=… so a past card opens in the same view the
  // current one uses — including its share actions (PRD 7.6.2, re-share).
  const cardId = searchParams.get("id");

  const [card, setCard] = useState<JournalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ShareOutcome | null>(null);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const showFeedback = useCallback((outcome: ShareOutcome) => {
    if (!outcome.message) return;
    setFeedback(outcome);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = cardId ? await getJournalById(cardId) : await getLatestJournal();
        if (cancelled) return;
        setCard(data);
      } catch {
        // "No card yet" and "the request failed" look the same to a student
        // who has never had one, and an alarming red banner over the friendly
        // empty state is the worse of the two readings. The empty state's
        // "Build it now" is the retry.
        if (!cancelled) setCard(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  // Opening the card counts as seeing it, which is what suppresses Friday's
  // notification for a student who got here first (PRD 7.8). Fire-and-forget:
  // a failed mark must never block the card from rendering.
  useEffect(() => {
    if (!card || card.viewedAt) return;
    markJournalViewed(card.id).catch(() => { });
  }, [card]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const { data, message } = await generateJournal();
      if (data) setCard(data);
      else showFeedback({ ok: true, message: message ?? "No card for this week yet." });
    } catch {
      showFeedback({ ok: false, message: "Could not build your card right now. Try again." });
    } finally {
      setGenerating(false);
    }
  }, [showFeedback]);

  const runShare = useCallback(
    async (key: string, action: () => Promise<ShareOutcome>) => {
      setBusyAction(key);
      try {
        showFeedback(await action());
      } finally {
        setBusyAction(null);
      }
    },
    [showFeedback],
  );

  if (loading) return <PageLoader label="Loading your week in wins…" />;

  const imageSrc = journalImageUrl(card?.imageUrl ?? null);
  const shareUrl = card ? journalShareUrl(card.shareSlug) : "";
  const shareText = buildShareText(card?.hero.title ?? null, card?.weekLabel ?? null);
  const canShare = Boolean(card && imageSrc);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans']">
      <PageHeader />

      {!card ? (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-2xl border border-brand/10 bg-surface p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-tint text-ink">
            <TrophyIcons size={26} />
          </span>
          <h2 className="text-xl font-bold text-ink">Your first card is on its way</h2>
          <p className="max-w-md text-sm text-muted">
            Win Journals are built every Friday evening from the week you just had. Study a
            couple of days this week and yours will be waiting.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-[#FF7A59] px-8 py-2 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {generating ? "Building…" : "Build it now"}
          </button>
          {feedback?.message && (
            <p
              className={`text-sm ${feedback.ok ? "text-muted" : "text-danger"}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Journal card */}
          <div className="flex justify-center">
            <div
              data-theme="dark"
              className="w-full max-w-3xl rounded-2xl border border-[#242453] p-6 shadow-[0px_4px_20px_0px_#00000008] sm:p-8"
              style={{
                background:
                  "linear-gradient(146.21deg, #201A51 5.35%, #1C1C71 50.22%, #111145 95.09%)",
              }}
            >
              <div className="flex flex-col items-center text-center">
                <Logo2 size="compact" />

                <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[2.4px] leading-[14.4px] text-[#FAF7F2] sm:text-xs">
                  Your Week in Wins
                </p>

                <h2 className="mt-1 text-xl font-semibold leading-[31.2px] text-[#FAF7F2] sm:text-2xl">
                  {card.weekLabel ?? "This week"}
                </h2>

                <div className="mt-12 flex justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF7F2] p-3 text-[#111145]">
                    <TrophyIcons size={24} />
                  </span>
                </div>

                <p className="mt-4 text-lg font-semibold text-[#FAF7F2] sm:text-xl">
                  {(HERO_GREETING[card.hero.tier ?? 6] ?? HERO_GREETING[6]!)(firstName)}
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#FAF7F2] sm:text-3xl">
                  {card.hero.title}
                </p>

                {card.hero.description && (
                  <p className="mt-2 max-w-lg text-sm text-[#8B8998]">{card.hero.description}</p>
                )}
              </div>

              {/* Effort summary */}
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <StatTile
                  icon={<FlameIcon />}
                  text={`${card.stats.streakCount} day streak`}
                  caption={card.stats.streakCount >= 7 ? "Milestone reached" : "Building it back"}
                />
                <StatTile
                  icon={<Check />}
                  text={`${card.stats.tasksCompleted} tasks completed`}
                  caption={`${card.stats.activeDays}/7 days active`}
                />
                <StatTile
                  icon={<ClockIcon />}
                  text={`${card.stats.focusHoursLabel} focused study`}
                  caption={
                    card.stats.activeDays > 0
                      ? `${(card.stats.focusSeconds / 3600 / card.stats.activeDays).toFixed(1)}h avg/day`
                      : undefined
                  }
                />
                <StatTile
                  icon={<LayersIcon />}
                  text={`${card.stats.chaptersMastered} topics mastered`}
                  caption={card.stats.topics.length > 0 ? card.stats.topics.join(", ") : undefined}
                />
              </div>

              {/* Mock improvement — delta only, never the raw score */}
              {card.stats.mockDelta !== null && (
                <div className="mt-6 flex w-full items-center gap-4 rounded-xl bg-[#FF7A59] px-7 py-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#FF7A59]">
                    <TrendingUpIcon />
                  </span>
                  <div className="flex flex-col">
                    <p className="text-base font-bold leading-6 text-[#FAF7F2]">
                      Mock score: +{card.stats.mockDelta} marks
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-[#1A1A4E]">
                      Up from your last attempt
                    </p>
                  </div>
                </div>
              )}

              {/* Pace anchor */}
              {card.stats.paceLabel && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#FAF7F214] bg-[#FAF7F20F] p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#13133D] text-[#FAF7F2] [&>svg]:h-[18px] [&>svg]:w-auto">
                    <TargetIcon />
                  </span>
                  <p className="text-base font-semibold text-[#FAF7F2]">{card.stats.paceLabel}</p>
                </div>
              )}

              {(card.stats.isRecoveryWeek ||
                card.stats.badDayReturn ||
                card.stats.lowEnergyDays > 0) && (
                  <div className="mt-4 rounded-2xl border border-[#FAF7F214] bg-[#FAF7F20F] p-5">
                    <p className="text-sm text-[#8B8998]">
                      {card.stats.isRecoveryWeek
                        ? "You took a recovery week."
                        : card.stats.lowEnergyDays > 0
                          ? `You had ${card.stats.lowEnergyDays} low energy ${card.stats.lowEnergyDays === 1 ? "day" : "days"}.`
                          : "You had a hard day this week."}
                    </p>
                    <p className="mt-1 text-base font-semibold text-[#FAF7F2]">
                      {card.stats.isRecoveryWeek
                        ? "You honored your recovery."
                        : "You came back stronger."}
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Actions */}
          <div className="mx-auto flex w-full max-w-[766px] flex-col items-center gap-4 rounded-2xl border border-[#FAF7F214] bg-[#111145] px-6 py-7">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => runShare("download", () => downloadCard(imageSrc!, card.weekLabel))}
                disabled={!canShare || busyAction !== null}
                className="flex items-center gap-2 rounded-lg bg-[#FF7A59] px-8 py-2 text-base font-bold text-[#FAF7F2] transition hover:brightness-110 disabled:opacity-60"
              >
                <DownloadIcon />
                {busyAction === "download" ? "Saving…" : "Download"}
              </button>

              <button
                type="button"
                onClick={() =>
                  runShare("whatsapp", () =>
                    shareToWhatsApp(imageSrc!, card.weekLabel, shareUrl, shareText),
                  )
                }
                disabled={!canShare || busyAction !== null}
                className="flex items-center gap-2 rounded-lg border border-[#FAF7F2] px-6 py-2 text-base font-bold text-[#FAF7F2] transition hover:bg-white/5 disabled:opacity-60"
              >
                <WhatsAppIcon />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => runShare("copy", () => copyShareLink(shareUrl))}
                disabled={!canShare || busyAction !== null}
                className="flex items-center gap-2 rounded-lg border border-[#FAF7F2] px-6 py-2 text-base font-bold text-[#FAF7F2] transition hover:bg-white/5 disabled:opacity-60"
              >
                <CopyIcon />
                Copy link
              </button>
            </div>

            <p
              className={`min-h-[20px] text-sm ${feedback?.ok === false ? "text-[#FFB4A2]" : "text-[#8B8998]"}`}
              role="status"
              aria-live="polite"
            >
              {feedback?.message ?? "Nothing is posted anywhere until you share it yourself."}
            </p>
          </div>
        </>
      )}

      <Link
        href="/home/journal/history"
        className="text-center  text-[14px] font-semibold leading-[100%] tracking-[0%] text-ink sm:text-[15px] md:text-[16px]"
      >
        View History
      </Link>
    </div>
  );
}

export default function WeeklyWinJournalPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your week in wins…" />}>
      <WeeklyWinJournalContent />
    </Suspense>
  );
}
