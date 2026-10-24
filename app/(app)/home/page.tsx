"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { QuickAccessGrid } from "@/components/home/v2/QuickAccessGrid";
import { CheckInStrip, GreetingStrip } from "@/components/home/v2/HomeTopStrips";
import { FocusNextCard, WeeklyProgressStrip } from "@/components/home/v2/HomeInsightRows";
import { TodayPlanCard } from "@/components/home/v2/TodayPlanCard";
import { StudyConsistencyCard } from "@/components/home/StudyConsistencyCard";
import { usePlanDay } from "@/components/planner/usePlanDay";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { RecoveryModeModal } from "@/components/home/RecoveryModeModal";
import { CheckInModal, MOODS, type Mood } from "@/components/check-in/CheckInModal";
import {
  moodIdToApiValue,
  apiValueToMoodId,
  getCheckInStatus,
  endRecoveryMode,
  activateRecoveryMode,
  type BurnoutStatus,
} from "@/lib/api/checkin";
import { activateBacklogRecovery, type BacklogRecoveryStatus } from "@/lib/api/backlog";
import { BurnoutSignalModal } from "@/components/home/BurnoutSignalModal";
import { PlannerCheckInModal } from "@/components/home/PlannerCheckInModal";
import { WellnessResourceModal } from "@/components/home/WellnessResourceModal";
import { HomePartnerMatchPrompt } from "@/components/home/HomePartnerMatchPrompt";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { formatFullDate } from "@/lib/utils/datetime";
import { useGreeting } from "@/lib/utils/greeting";
import {
  regeneratePlanForMood,
  generatePlan,
  getTodayPlan,
  deleteAllPlannerTasks,
  acknowledgeLateOnboarding,
  type TodayPlanResponse,
  type StudyConsistency,
  getStudyConsistency,
} from "@/lib/api/planner";
import { getJournalSettings, getLatestJournal, type JournalCard } from "@/lib/api/journal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { LoderIcon, DotIcon } from "@/assets/icons";
import { CheckCircleIcon, ArrowRightIcon, AlertTriangleIcon, XIcon, UsersIcon } from "@/components/ui/icons";
import { DailyInsightCard } from "@/components/home/DailyInsightCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { trackPlanner } from "@/lib/telemetry/planner";

/** Monday of the current local week as YYYY-MM-DD — the form of a card's weekStart. */
function currentWeekStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function subscribeNoop() {
  return () => { };
}

function getIsFridaySnapshot() {
  return new Date().getDay() === 5;
}

function getIsFridayServerSnapshot() {
  return false;
}

/**
 * Home, in the order a student reads it on a phone: greeting, check-in, today's plan, the daily insight, where to focus
 * next, weekly progress, quick access. The pop-ups (burnout, recovery, late sign-up, partner) are unchanged.
 */
export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const storedFullName = useStoredFullName();
  const firstName = storedFullName.trim().split(/\s+/)[0] || "there";
  const greeting = useGreeting();
  // Today's plan: loaded and rebuilt through the planner v2 hook. A failure there never takes Home down.
  const plan = usePlanDay(undefined);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const [isRegenerateOpen, setRegenerateOpen] = useState(false);
  const [isCheckInOpen, setCheckInOpen] = useState(false);
  const [energyMood, setEnergyMood] = useState<Mood | null>(null);
  // The older "today" payload still supplies the exam countdown and the late-sign-up flag.
  const [planData, setPlanData] = useState<TodayPlanResponse | null>(null);
  // First-paint gate: the check-in strip must not flash before we know whether today's check-in is done.
  const [checkInLoaded, setCheckInLoaded] = useState(false);
  const [isGeneratingPlan, setGeneratingPlan] = useState(false);
  const [streakCount, setStreakCount] = useState<number | null>(null);
  const [isInRecoveryMode, setInRecoveryMode] = useState(false);
  const [recoveryWeekDay, setRecoveryWeekDay] = useState(0);
  const [isEndRecoveryOpen, setEndRecoveryOpen] = useState(false);
  const [isEndingRecovery, setEndingRecovery] = useState(false);
  // Backlog Recovery Mode (PRD 11.5) — shares the end-recovery flow above.
  const [backlogRecovery, setBacklogRecovery] = useState<BacklogRecoveryStatus | null>(null);
  const [isRecoveryModeModalOpen, setRecoveryModeModalOpen] = useState(false);
  const [isActivatingBacklogRecovery, setActivatingBacklogRecovery] = useState(false);
  const [isLateSignupPromptOpen, setLateSignupPromptOpen] = useState(false);
  const [isQuickSessionTaskOpen, setQuickSessionTaskOpen] = useState(false);
  const hasPromptedLateSignup = useRef(false);
  // Section 4.2.2 — burnout tier / disengagement pop-ups. One per session.
  const [burnout, setBurnout] = useState<BurnoutStatus | null>(null);
  const [burnoutModal, setBurnoutModal] = useState<
    null | "inquiry" | "tier3" | "tier4" | "wellness"
  >(null);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [lastCheckinDate, setLastCheckinDate] = useState("");
  const [backlogStatus, setBacklogStatus] = useState<{
    isAvailable: boolean;
    latest: { title: string; daysOverdue: number } | null;
  }>({ isAvailable: false, latest: null });
  const hasPromptedBurnout = useRef(false);
  const isFriday = useSyncExternalStore(
    subscribeNoop,
    getIsFridaySnapshot,
    getIsFridayServerSnapshot,
  );

  // Section 7 — the Friday Win Journal card. `undefined` until loaded; null
  // when the student has no card yet. Hidden if they've turned journals off.
  const [weeklyJournal, setWeeklyJournal] = useState<JournalCard | null | undefined>(undefined);
  const [isJournalEnabled, setJournalEnabled] = useState(true);

  useEffect(() => {
    if (!isFriday) return;
    Promise.allSettled([getLatestJournal(), getJournalSettings()]).then(([latest, settings]) => {
      setWeeklyJournal(latest.status === "fulfilled" ? latest.value.data : null);
      if (settings.status === "fulfilled") setJournalEnabled(settings.value.data.winJournalEnabled);
    });
  }, [isFriday]);

  // One telemetry event per visit, once the plan has shown.
  const viewed = useRef(false);
  useEffect(() => {
    if (plan.status === "ready" && !viewed.current) {
      viewed.current = true;
      trackPlanner("planner_view", { surface: "home", tasks: plan.day.tasks.length, mode: plan.day.mode });
    }
  }, [plan.status, plan.day]);

  const refetchPlan = () => {
    void plan.refresh();
    getTodayPlan()
      .then(({ data }) => setPlanData(data))
      .catch(() => {
        // The countdown and late-sign-up flag are optional; the plan card has its own retry.
      });
  };

  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);

  useEffect(() => {
    getStudyConsistency()
      .then(({ data }) => setConsistency(data))
      .catch(console.error);
  }, []);

  const refetchCheckInStatus = () => {
    getCheckInStatus()
      .then(({ data }) => {
        setStreakCount(data.checkin?.streakCount ?? null);
        const bs = data.burnoutStatus ?? null;
        setBurnout(bs);
        setInRecoveryMode(
          Boolean(bs?.recoveryWeek?.active) || Boolean(data.checkin?.isInRecoveryMode),
        );
        setRecoveryWeekDay(bs?.recoveryWeek?.day ?? 0);
        setLastCheckinDate(data.checkinDate);
        setBacklogStatus({
          isAvailable: data.isBacklogAvailable,
          latest: data.latestBacklog,
        });
        // Not auto-opened: backlogRecovery.suggested only surfaces the
        // "Start Recovery" button (below) — the student decides when to open
        // RecoveryModeModal, rather than it popping up on its own.
        setBacklogRecovery(data.backlogRecovery);
        maybePromptBurnout(bs, data.checkinDate);
        const moodValue = data.checkin?.mood;
        if (moodValue) {
          const moodId = apiValueToMoodId(moodValue);
          setEnergyMood(MOODS.find((mood) => mood.id === moodId) ?? null);
        } else {
          setEnergyMood(null);
        }
      })
      .catch(() => {
        // Best-effort — mood/streak stay unset (no dummy fallback) until this succeeds.
      })
      .finally(() => setCheckInLoaded(true));
  };

  // Section 4.2.2 — pick at most one tier/inquiry pop-up per session. Tier 4/5
  // also honour a per-day "seen" stamp so they don't re-nag every home visit
  // (Section 4.6).
  const BURNOUT_SEEN_KEY = "prepex.burnoutPromptSeen";
  const burnoutSeenStamp = (tierResponse: string, checkinDate: string) =>
    `${checkinDate.slice(0, 10)}:${tierResponse}`;

  const maybePromptBurnout = (bs: BurnoutStatus | null, checkinDate: string) => {
    if (!bs || hasPromptedBurnout.current) return;

    if (bs.pendingInquiry) {
      hasPromptedBurnout.current = true;
      setInquiryId(bs.pendingInquiry.id);
      setBurnoutModal("inquiry");
      return;
    }
    if (bs.tierResponse === "RECOVERY_SUGGESTED") {
      hasPromptedBurnout.current = true;
      setBurnoutModal("tier3");
      return;
    }
    if (bs.tierResponse === "RECOVERY_ACTIVATED" || bs.tierResponse === "WELLNESS") {
      let seen = false;
      try {
        seen = localStorage.getItem(BURNOUT_SEEN_KEY) === burnoutSeenStamp(bs.tierResponse, checkinDate);
      } catch {
        seen = false;
      }
      if (seen) return;
      hasPromptedBurnout.current = true;
      setBurnoutModal(bs.tierResponse === "WELLNESS" ? "wellness" : "tier4");
    }
  };

  const dismissBurnoutModal = () => {
    const bs = burnout;
    if (bs && (bs.tierResponse === "RECOVERY_ACTIVATED" || bs.tierResponse === "WELLNESS")) {
      try {
        localStorage.setItem(BURNOUT_SEEN_KEY, burnoutSeenStamp(bs.tierResponse, lastCheckinDate));
      } catch {
        // per-day stamp just won't persist — the session ref still guards.
      }
    }
    setBurnoutModal(null);
  };

  const handleActivateRecovery = async () => {
    try {
      await activateRecoveryMode();
      await generatePlan("RECOVERY");
    } catch {
      // Best-effort — the banner/plan refresh below still reflects server state.
    }
    setBurnoutModal(null);
    refetchPlan();
    refetchCheckInStatus();
  };

  const handleInquiryResolved = (actionTaken: string) => {
    setBurnoutModal(null);
    setInquiryId(null);
    if (actionTaken === "regenerate_walkthrough") {
      setRegenerateOpen(true);
    } else if (actionTaken === "wellness_surfaced" || actionTaken === "wellness_page") {
      setBurnoutModal("wellness");
    }
    // "plan_strategy_review" / "none" — nothing more to show; response is saved.
  };

  useEffect(refetchPlan, []); // eslint-disable-line react-hooks/exhaustive-deps -- once on arrival
  useEffect(refetchCheckInStatus, []); // eslint-disable-line react-hooks/exhaustive-deps -- once on arrival

  useEffect(() => {
    if (hasPromptedLateSignup.current) return;
    if (planData?.plan?.isLateSingUp) {
      hasPromptedLateSignup.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- shown once, when the flag first arrives
      setLateSignupPromptOpen(true);
    }
  }, [planData]);

  const handleLateSignupDecline = () => {
    setLateSignupPromptOpen(false);
    acknowledgeLateOnboarding().catch(() => {
      // Best-effort — the prompt is already dismissed either way.
    });
  };

  const handleLateSignupAccept = async () => {
    setLateSignupPromptOpen(false);
    const plannerId = planData?.plan?.id;
    const requests = [
      acknowledgeLateOnboarding(),
      ...(plannerId ? [deleteAllPlannerTasks(plannerId)] : []),
    ];
    try {
      await Promise.all(requests);
      if (plannerId) refetchPlan();
    } catch {
      // Best-effort — still let the student start a quick session.
    }
    setQuickSessionTaskOpen(true);
  };

  const handleEndRecovery = async () => {
    setEndingRecovery(true);
    try {
      await endRecoveryMode();
      setInRecoveryMode(false);
      setBacklogRecovery((prev) => (prev ? { ...prev, active: false, day: 0 } : prev));
      setEndRecoveryOpen(false);
      refetchPlan();
    } catch {
      // Best-effort — the banner stays up so the user can retry.
    } finally {
      setEndingRecovery(false);
    }
  };

  // PRD 11.5.1 — student taps "Yes, recover for 7 days" on RecoveryModeModal.
  // Backlog mode is flag-driven (not reason-driven like burnout's RECOVERY),
  // so a plain "SCHEDULED" regen is enough for determineMode() to pick it up.
  const handleActivateBacklogRecovery = async () => {
    setActivatingBacklogRecovery(true);
    try {
      await activateBacklogRecovery();
      await generatePlan("SCHEDULED");
    } catch {
      // Best-effort — the banner/plan refresh below still reflects server state.
    }
    setActivatingBacklogRecovery(false);
    setRecoveryModeModalOpen(false);
    refetchPlan();
    refetchCheckInStatus();
  };

  const handleMoodSave = async (mood: Mood) => {
    setEnergyMood(mood);
    setGeneratingPlan(true);
    try {
      await regeneratePlanForMood(moodIdToApiValue(mood.id));
      await plan.refresh();
      refetchCheckInStatus();
    } catch {
      // Best-effort — the UI already reflects the new mood.
    } finally {
      setGeneratingPlan(false);
    }
  };

  const examCountdown =
    planData?.plan?.targetedExam && planData.plan.dayRemainingForExam != null
      ? `${planData.plan.targetedExam} in ${planData.plan.dayRemainingForExam} days`
      : null;

  // Friday Win Journal card. The latest card may still be last week's until
  // this week's is generated on Friday evening, so it's labelled by its week.
  const isThisWeeksJournal = weeklyJournal?.weekStart?.slice(0, 10) === currentWeekStartIso();
  // weekLabel reads "Week of Sep 7–13, 2026".
  const journalSubtitle = !weeklyJournal
    ? "Your first card is on its way"
    : isThisWeeksJournal
      ? (weeklyJournal.weekLabel ?? "Weekly progress reflection & insights")
      : `Last card · ${weeklyJournal.weekLabel ?? "an earlier week"} · This week's is built on Friday evening`;
  const journalAheadPercent =
    weeklyJournal?.stats.paceDeltaPercent != null && weeklyJournal.stats.paceDeltaPercent > 0
      ? Math.round(weeklyJournal.stats.paceDeltaPercent)
      : null;
  const journalStats = weeklyJournal
    ? [
        { value: String(weeklyJournal.stats.activeDays), label: "Active Days" },
        { value: String(weeklyJournal.stats.tasksCompleted), label: "Tasks Completed" },
        { value: weeklyJournal.stats.focusHoursLabel.replace(/h$/, ""), label: "Study Hours" },
      ]
    : [];

  // Hold the page only until we know today's check-in state. The plan, goals and tiles each load in place.
  if (!checkInLoaded || (isFriday && weeklyJournal === undefined)) return <PageLoader label="Loading your day…" />;

  return (
    <div className="flex flex-col gap-5 p-4 pb-8 sm:p-6 lg:p-8" data-testid="home-page">
      <GreetingStrip
        greeting={greeting}
        firstName={firstName}
        streakCount={streakCount}
        dateText={formatFullDate(new Date())}
        examCountdown={examCountdown}
        actions={
          <>
            {/* TODO(planner-v2): owner = pods window. The pods teaser (section 8) is hidden until pods exist; this link is the way to partners meanwhile. */}
            <Link href="/home/partner" aria-label="Partner and pods" title="Partner" data-coach="quick-partner" data-testid="home-pods" className="flex size-11 items-center justify-center rounded-full bg-surface text-ink hover:bg-tint-strong">
              <UsersIcon />
            </Link>
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </>
        }
      />

      {(isInRecoveryMode || backlogRecovery?.active) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
              <AlertTriangleIcon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-warning">Recovery Mode</p>
              <p className="text-xs text-muted">Your recovery plan is active</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs font-semibold text-warning">
              {isInRecoveryMode
                ? recoveryWeekDay > 0
                  ? `Recovery Week · Day ${recoveryWeekDay} of 7`
                  : "Recovery Week"
                : backlogRecovery && backlogRecovery.day > 0
                  ? `Backlog Recovery · Day ${backlogRecovery.day} of ${backlogRecovery.totalDays}`
                  : "Backlog Recovery"}
            </span>
            <button
              type="button"
              aria-label="End recovery mode"
              onClick={() => setEndRecoveryOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-warning hover:bg-warning/20"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}

      <CheckInStrip mood={energyMood} busy={isGeneratingPlan} onPick={(mood) => void handleMoodSave(mood)} onChange={() => setCheckInOpen(true)} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <TodayPlanCard plan={plan} onChanged={refetchCheckInStatus} />

          <DailyInsightCard />

          <FocusNextCard />

          <WeeklyProgressStrip />

          {isFriday && isJournalEnabled && (
            <Link
              href="/home/journal"
              data-coach="quick-journal"
              className="block rounded-[24px] border border-brand/10 bg-surface p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] transition-colors hover:border-brand/30 dark:shadow-[0px_2px_8px_rgba(0,0,0,0.2)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-7 text-[#0D0E2B] dark:text-[#FAF7F2]!">Weekly Win Journal</p>
                  <p className="text-xs font-medium text-muted">{journalSubtitle}</p>
                </div>
                {journalAheadPercent !== null && (
                  <span className="flex shrink-0 items-center gap-2 rounded-full border border-tint-strong bg-tint-strong px-3 py-1.5 text-xs font-bold text-ink shadow-[0px_1px_2px_0px_#0000000D] dark:border-[#242453]! dark:bg-[#242453]!">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5" />
                    {journalAheadPercent}% Ahead of Timeline
                  </span>
                )}
              </div>

              {weeklyJournal ? (
                <>
                  {weeklyJournal.hero.title && (
                    <p className="mt-4 text-sm font-semibold text-ink">{weeklyJournal.hero.title}</p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-6 divide-x divide-brand/10 text-center">
                    {journalStats.map((stat) => (
                      <div key={stat.label} className="flex flex-col items-center gap-2">
                        <p className="text-3xl font-extrabold leading-none text-[#0D0E2B] dark:text-[#FAF7F2]!">
                          {stat.value}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-center text-sm text-muted">
                  Win Journals are built every Friday evening from the week you just had. Study a couple of days
                  this week and yours will be waiting.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-brand/10 pt-3 sm:mt-4">
                <span className="min-w-0 truncate text-[13px] font-bold text-ink sm:text-sm">
                  Explore Full Weekly Summary
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-[#333333] dark:text-[#FAF7F2]!">
                  <span className="hidden sm:inline">Click to view details</span>
                  {/* Wrapped: ArrowRightIcon doesn't forward className. */}
                  <span className="flex shrink-0">
                    <ArrowRightIcon />
                  </span>
                </span>
              </div>
            </Link>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <QuickAccessGrid day={plan.day} />
          <StudyConsistencyCard consistency={consistency} isDark={isDark} />
        </div>
      </div>

      {backlogStatus.isAvailable && backlogStatus.latest && (
      <div
        data-coach="backlog-alert"
        className="flex flex-col gap-4 rounded-2xl border border-[#F59E0B] bg-[#FFFBEB] p-6 dark:border-transparent! dark:bg-[#111145] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#F59E0B] shadow-[0px_1px_2px_0px_#0000000D]">
            <DotIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#F59E0B]">Backlog Alert</p>
            <p className="text-xs text-[rgba(70,70,80,0.7)] dark:text-[#FAF7F2]!"><span className="truncate">{backlogStatus.latest.title}</span> • Pending for {backlogStatus.latest.daysOverdue} days</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          {backlogRecovery?.suggested && (
            <Button
              onClick={() => setRecoveryModeModalOpen(true)}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto justify-center border! border-[#1A1A4E]! bg-white! text-[#1A1A4E]! shadow-[0px_1px_2px_0px_#0000000D] hover:bg-white! dark:border-transparent!"
            >
              Start Recovery
            </Button>
          )}
          <Button
            href="/home/backlog"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto justify-center border! border-[#1A1A4E]! bg-white! text-[#1A1A4E]! shadow-[0px_1px_2px_0px_#0000000D] hover:bg-white! dark:border-transparent!"
          >
            Review Now
          </Button>
        </div>
      </div>
      )}

      <ConfirmModal
        open={isEndRecoveryOpen}
        onClose={() => setEndRecoveryOpen(false)}
        onConfirm={handleEndRecovery}
        title="End recovery mode?"
        description="Are you sure you want to end recovery mode?"
        confirmLabel={isEndingRecovery ? "Ending..." : "Yes, End Recovery"}
      />
      <CheckInModal
        open={isCheckInOpen}
        onClose={() => setCheckInOpen(false)}
        name={firstName}
        onSave={handleMoodSave}
      />
      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={refetchPlan}
      />
      <ConfirmModal
        open={isLateSignupPromptOpen}
        onClose={handleLateSignupDecline}
        onConfirm={handleLateSignupAccept}
        title="You signed up late"
        description="Next plan is ready, but want to do a quick session now instead?"
        confirmLabel="Yes"
        cancelLabel="No"
      />
      <AddCustomTaskModal
        open={isQuickSessionTaskOpen}
        onClose={() => setQuickSessionTaskOpen(false)}
        onTaskAdded={() => window.location.reload()}
        lockedTaskType="New Learning"
      />
      <RegeneratePlanModal
        open={isRegenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        onRegenerated={refetchPlan}
      />

      {/* Section 4.2.2 / 4.4 — burnout tier + disengagement pop-ups */}
      <PlannerCheckInModal
        open={burnoutModal === "inquiry"}
        inquiryId={inquiryId}
        onClose={dismissBurnoutModal}
        onResolved={handleInquiryResolved}
      />
      <BurnoutSignalModal
        open={burnoutModal === "tier3"}
        onClose={dismissBurnoutModal}
        title="How's it going?"
        intro="A few things stood out this week:"
        signalText={burnout?.signalLabels ?? []}
        primaryLabel="Start a Recovery Week"
        onPrimary={handleActivateRecovery}
        secondaryLabel="Not now"
      />
      <BurnoutSignalModal
        open={burnoutModal === "tier4"}
        onClose={dismissBurnoutModal}
        title="Your plan is lighter this week"
        intro="We've eased things off for a few days so you can reset. You can end it anytime."
        signalText={burnout?.signalLabels ?? []}
        primaryLabel="View today's plan"
        onPrimary={() => {
          dismissBurnoutModal();
          router.push("/planner");
        }}
        secondaryLabel="Got it"
      />
      <WellnessResourceModal open={burnoutModal === "wellness"} onClose={dismissBurnoutModal} />
      <RecoveryModeModal
        open={isRecoveryModeModalOpen}
        onClose={() => setRecoveryModeModalOpen(false)}
        onConfirm={handleActivateBacklogRecovery}
        isSubmitting={isActivatingBacklogRecovery}
      />

      {/* PRD 6.2 — a proposed partner, once per sign-in. Held back while any
          other Home pop-up is up, so the two never stack. */}
      <HomePartnerMatchPrompt
        suppressed={
          burnoutModal !== null ||
          isLateSignupPromptOpen ||
          isQuickSessionTaskOpen ||
          isCheckInOpen ||
          isRegenerateOpen ||
          isAddTaskOpen ||
          isRecoveryModeModalOpen ||
          isEndRecoveryOpen ||
          isGeneratingPlan
        }
      />

      {isGeneratingPlan && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm">
          <LoderIcon className="h-10 w-10 animate-spin text-ink" />
          <p className="text-base font-bold text-ink">Generating plan...</p>
          <p className="text-sm text-muted">Adjusting today&apos;s plan to your energy</p>
        </div>
      )}
    </div>
  );
}
