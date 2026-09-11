"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { TaskRow } from "@/components/home/TaskRow";
import type { Task, TaskType } from "@/components/home/TaskRow";
import { toRowDifficulty } from "@/components/home/PlanTaskRow";
import { prettyDifficulty } from "@/lib/api/practice";
import { withPracticeProgressLabel, withResumeLabel } from "@/components/home/taskTypes";
import { QuickFocusModal } from "@/components/home/QuickFocusModal";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
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
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { formatFullDate } from "@/lib/utils/datetime";
import { useGreeting } from "@/lib/utils/greeting";
import {
  regeneratePlanForMood,
  generatePlan,
  getTodayPlan,
  deleteAllPlannerTasks,
  acknowledgeLateOnboarding,
  type PlannerTask,
  type TodayPlanResponse,
  type StudyConsistency,
  type StudyConsistencyDay,
  getStudyConsistency,
} from "@/lib/api/planner";
import { getStoredUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { FlameIcon, BackIcon, BookIcon, BriefcaseIcon, ChartBarIcon, LayersIcon, LoderIcon, QuickIcon, RadarIcon, RevisionIcon, TrophyIcon, UserIcon, SparkleIcon, DotIcon } from "@/assets/icons";
import {
  // SparkleIcon,
  RefreshIcon,
  PlusIcon1 as PlusIcon,
  ClockIcon,
  InfoIcon,
  PencilIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  XIcon,
} from "@/components/ui/icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTheme } from "@/components/theme/ThemeProvider";

const TASKS: Task[] = [
  {
    id: "newtons-laws",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "revision",
    title: "Newton's Laws",
    meta: "Concept Video • NCERT Chapter",
    duration: "40 min",
    estimatedMinutes: 40,
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Revision",
  },
  {
    id: "electrochemistry",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "new-learning",
    title: "Electrochemistry",
    meta: "Concept Video • NCERT Chapter",
    duration: "60 min",
    estimatedMinutes: 60,
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Session",
  },
  {
    id: "calculus-practice-1",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "Concept Video • NCERT Chapter",
    duration: "60 min",
    estimatedMinutes: 60,
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Practice",
  },
  {
    id: "calculus-practice-2",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "Concept Video • NCERT Chapter",
    duration: "90 min",
    estimatedMinutes: 90,
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Practice",
  },
];

const JOURNAL_STATS = [
  { value: "14", label: "Days Completed" },
  { value: "27", label: "Tasks Mastered" },
  { value: "19", label: "Study Hours" },
];

// data-coach anchors for the Onboarding Coach (Section 16). Keyed by label so
// the Quick Access list stays a plain array; absent labels get no anchor.
const QUICK_ACCESS_COACH_ANCHOR: Record<string, string> = {
  Revision: "quick-revision",
  "Weekly Win Journal": "quick-journal",
  "Mock Test Analysis": "quick-mock",
  "Mistake Notebook": "quick-mistakes",
  Partner: "quick-partner",
};

const QUICK_ACCESS = [
  {
    href: "/practice/sessions",
    label: "Practice", subtitle: "Solve Questions", icon: <PencilIcon />
  },
  {
    href: "/home/mock-analysis",
    label: "Mock Test Analysis",
    subtitle: "Analyze & Improve",
    icon: <ChartBarIcon className="h-5 w-5" />,
  },
  {
    href: "/home/mistake-notebook",
    label: "Mistake Notebook", icon: <BookIcon className="h-5 w-5" />
  },
  // {
  //   href: "/home/focus-topic",
  //   label: "This Week's Focus Topic",
  //   icon: <LayersIcon className="h-5 w-5" />,
  // },
  {
    href: "/home/focus-next",
    label: "Where to focus next", icon: <RadarIcon className="h-5 w-5" />
  },
  {
    href: "/home/partner",
    label: "Partner", icon: <UserIcon className="h-5 w-5" />
  },
  {
    href: "/home/leaderboard",
    label: "Leader Board", icon: <TrophyIcon className="h-5 w-5" />
  },
  {
    href: "/home/resource-library",
    label: "Resource Library", icon: <BriefcaseIcon className="h-5 w-5" />
  },
  { 
    href: "/home/revision", 
    label: "Revision", icon: <RevisionIcon className="h-5 w-5" /> 

  },
  {
    href: "/home/journal",
    label: "Weekly Win Journal",
    subtitle: "Reflect & celebrate wins",
    icon: <PencilIcon />,
  },
];

const CONSISTENCY_THEME = {
  light: ["#eef0f8", "#c7cbe8", "#9aa0d1", "#5b62a8", "#1a1a4e"],
  dark: ["#1c1c4a", "#2c2c66", "#4141a0", "#6d6dc4", "#a5a5e8"],
};

const CONSISTENCY_WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Buckets a 0-100 daily completion percentage into the calendar's 5 activity levels. */
function toActivityLevel(percentage: number): number {
  if (percentage <= 0) return 0;
  if (percentage < 25) return 1;
  if (percentage < 50) return 2;
  if (percentage < 75) return 3;
  return 4;
}

/**
 * Chunks days into Monday-start week rows, padding the first/last week with
 * nulls so each date lands under the correct weekday column.
 */
function groupConsistencyByWeek(days: StudyConsistencyDay[]): (StudyConsistencyDay | null)[][] {
  if (days.length === 0) return [];

  const [firstYear, firstMonth, firstDate] = days[0].date.split("-").map(Number);
  const firstWeekday = (new Date(firstYear, firstMonth - 1, firstDate).getDay() + 6) % 7; // Mon=0..Sun=6

  const cells: (StudyConsistencyDay | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (StudyConsistencyDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const TASK_TYPE_STYLE: Record<string, TaskType> = {
  PRACTICE: "practice",
  REVISION: "revision",
  LEARNING: "new-learning",
  WELLNESS: "wellness",
};

const TASK_ACTION_LABEL: Record<string, string> = {
  PRACTICE: "Start Practice",
  REVISION: "Start Revision",
  LEARNING: "Start Session",
  WELLNESS: "Start Session",
};


function formatWindow(window: string | null | undefined) {
  if (!window) return "";
  const label = window.toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toHomeTask(task: PlannerTask): Task {
  const isSundayDpp = task.taskType === "PRACTICE" && task.title === "DPP Sunday" && !task.chapter;
  return {
    id: task.id,
    subjectLabel: isSundayDpp ? "DPP" : task.subject?.code?.[0] ?? "W",
    subjectName: isSundayDpp ? "DPP" : task.subject?.name ?? "Wellness",
    type: TASK_TYPE_STYLE[task.taskType] ?? "new-learning",
    title: task.title,
    meta: task.description ?? task.chapter?.name ?? "",
    description: task.description ?? "",
    chapterName: task.chapter?.name ?? "",
    duration: `${task.estimatedMinutes} min`,
    estimatedMinutes: task.estimatedMinutes,
    difficulty: toRowDifficulty(task.chapter?.chapterMetadata?.difficulty),
    secondsCompleted: task.secondsCompleted,
    status: task.status,
    timeSlot: formatWindow(task.suggestedWindow),
    scheduledRange: task.scheduledStart && task.scheduledEnd
      ? `${task.scheduledStart} - ${task.scheduledEnd}`
      : undefined,
    hasResource: Boolean(task.chapter),
    actionLabel:
      task.taskType === "WELLNESS"
        ? "Wellness"
        : task.taskType === "PRACTICE"
          ? withPracticeProgressLabel("Start Practice", task.secondsCompleted, task.status)
          : withResumeLabel(TASK_ACTION_LABEL[task.taskType] ?? "Start Session", task.status),
    isCompleted: task.status === "COMPLETED",
    isCustom: Boolean(task.isAnchor),
    isWellness: task.taskType === "WELLNESS",
  };
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
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

export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const storedFullName = useStoredFullName();
  const firstName = storedFullName.trim().split(/\s+/)[0] || "there";
  const greeting = useGreeting();
  const [isQuickFocusOpen, setQuickFocusOpen] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceTaskId, setPracticeTaskId] = useState<string | null>(null);
  const [practiceTaskStats, setPracticeTaskStats] = useState<{
    estimatedMinutes: number;
    difficultyLabel: string;
  } | null>(null);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const [isRegenerateOpen, setRegenerateOpen] = useState(false);
  const [isCheckInOpen, setCheckInOpen] = useState(false);
  const [energyMood, setEnergyMood] = useState<Mood | null>(null);
  const [planData, setPlanData] = useState<TodayPlanResponse | null>(null);
  const [planLoadFailed, setPlanLoadFailed] = useState(false);
  // First-paint gates — the page renders once all three initial fetches settle.
  const [checkInLoaded, setCheckInLoaded] = useState(false);
  const [consistencyLoaded, setConsistencyLoaded] = useState(false);
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

  const refetchPlan = () => {
    getTodayPlan()
      .then(({ data }) => {
        setPlanData(data);
        setPlanLoadFailed(false);
      })
      .catch(() => {
        setPlanLoadFailed(true);
      });
  };

  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);

  useEffect(() => {
    getStudyConsistency()
      .then(({ data }) => setConsistency(data))
      .catch(console.error)
      .finally(() => setConsistencyLoaded(true));
  }, []);

  const consistencyWeeks = groupConsistencyByWeek(consistency?.days ?? []);
  const consistencyMonthName = consistency ? MONTH_NAMES[consistency.month - 1] ?? "" : "";
  const consistencyColors = CONSISTENCY_THEME[isDark ? "dark" : "light"];

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

  const handleHomeTaskChanged = () => {
    refetchPlan();
    refetchCheckInStatus();
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

  useEffect(refetchPlan, []);
  useEffect(refetchCheckInStatus, []);

  useEffect(() => {
    if (hasPromptedLateSignup.current) return;
    if (planData?.plan?.isLateSingUp) {
      hasPromptedLateSignup.current = true;
      setLateSignupPromptOpen(true);
    }
  }, [planData]);

  const handleLateSignupDecline = () => {
    setLateSignupPromptOpen(false);
    const userId = getStoredUser()?.id;
    if (userId) {
      acknowledgeLateOnboarding(userId).catch(() => {
        // Best-effort — the prompt is already dismissed either way.
      });
    }
  };

  const handleLateSignupAccept = async () => {
    setLateSignupPromptOpen(false);
    const userId = getStoredUser()?.id;
    const plannerId = planData?.plan?.id;
    const requests = [
      ...(userId ? [acknowledgeLateOnboarding(userId)] : []),
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
      const { data } = await getTodayPlan();
      setPlanData(data);
      refetchCheckInStatus();
    } catch {
      // Best-effort — the UI already reflects the new mood.
    } finally {
      setGeneratingPlan(false);
    }
  };

  const plan = planData?.plan;
  const summary = planData?.summary;
  const planTasks = (plan ? plan.tasks.map(toHomeTask) : TASKS).slice(0, 5);
  const examCountdown =
    plan?.targetedExam && plan?.dayRemainingForExam != null
      ? `${plan.targetedExam} in ${plan.dayRemainingForExam} days`
      : null;
  const completionPercent = summary?.completionPercentage ?? 0;
  const completedMinutes = summary ? summary.totalTimeCompletedSeconds / 60 : 78;
  const plannedMinutes = summary?.totalPlannedMinutes ?? 360;

  // Hold the whole page until every initial fetch has settled, so no card
  // paints with placeholder values before its data arrives. Later refetches
  // (mood change, recovery toggle, …) keep the page mounted.
  const isPageLoading =
    (!planData && !planLoadFailed) || !checkInLoaded || !consistencyLoaded;
  if (isPageLoading) return <PageLoader label="Loading your day…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink lg:text-h1">
            {greeting}, {firstName}
          </h1>
          <p
            className={`text-sm text-muted transition-opacity duration-300 ${examCountdown ? "opacity-100" : "opacity-0"}`}
          >
            {examCountdown ?? " "}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

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

      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">

          {/* Today's Energy Card */}
          <div
            data-coach="energy-card"
            className="relative rounded-2xl border border-brand/10 bg-surface p-3 @4xl:p-6"
          >
            <div className="flex min-w-0 flex-row items-center justify-between gap-2 @4xl:gap-4">

              <div className="flex min-w-0 flex-1 flex-row items-center gap-2 @4xl:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#EEF0F8] dark:bg-[#13133D] @4xl:h-15 @4xl:w-15">
                  <span className="text-[22px] leading-none @4xl:text-[26.67px]">
                    {energyMood?.emoji ?? ""}
                  </span>
                </div>

                <div className="min-w-0 flex flex-col items-start">
                  <p className="text-[9px] font-medium leading-[10px] tracking-normal text-muted @4xl:text-[12px] @4xl:leading-[14px]">
                    Today&apos;s Energy
                  </p>

                  <h3 className="mt-1 truncate text-[16px] font-bold leading-[18px] tracking-normal text-ink @4xl:text-[22px] @4xl:leading-[24px]">
                    {energyMood?.label ?? "—"}
                  </h3>

                  <p className="mt-1 truncate text-[10px] font-semibold leading-[12px] tracking-normal text-muted @4xl:text-[14px] @4xl:leading-[16px]">
                    Plan optimized for you
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCheckInOpen(true)}
                className="shrink-0 text-[10px] font-bold leading-[15px] tracking-normal text-ink hover:underline @4xl:text-[12px]"
              >
                Change
              </button>
            </div>
          </div>


          {/* Streak Card */}
          <Link
            href="/home/streak"
            data-coach="streak-card"
            className="block rounded-2xl border border-brand/10 bg-surface p-3 transition-colors hover:border-brand/30 @4xl:p-6"
          >
            <div className="flex min-w-0 flex-row items-center justify-between gap-2 @4xl:gap-4">

              <div className="flex min-w-0 flex-1 flex-row items-center gap-2 @4xl:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#FFF5F3] text-cta dark:bg-[#13133D] @4xl:h-16 @4xl:w-16">
                  <FlameIcon className="h-6 w-[22px] @4xl:h-7.5 @4xl:w-[26.67px]" />
                </div>

                <div className="min-w-0 flex flex-col items-start gap-0.5 @4xl:gap-1">
                  <h3 className="truncate text-[14px] font-bold leading-5 text-ink @4xl:text-[18px] @4xl:leading-7">
                    {streakCount !== null ? `${streakCount} Day Streak` : "—"}
                  </h3>

                  <p className="truncate text-[10px] font-semibold leading-4 tracking-normal text-muted @4xl:text-[14px] @4xl:leading-5">
                    Keep going.
                  </p>
                </div>
              </div>

              <BackIcon className="h-[12px] w-[7.4px] shrink-0 text-muted" />
            </div>
          </Link>


          {/* Today's Progress Card */}
          <div className="rounded-2xl border border-brand/10 bg-surface px-3 pt-3 pb-3 @4xl:px-6 @4xl:pt-4 @4xl:pb-6">

            <div className="flex justify-end">
              <span className="whitespace-nowrap text-[8px] leading-none text-muted @4xl:text-[11px]">
                {formatFullDate(new Date())}
              </span>
            </div>

            <div className="-mt-1 flex min-w-0 flex-row items-center gap-2 @4xl:gap-4">

              <div className="shrink-0">
                <CircularProgress
                  percent={completionPercent}
                  size={56}
                />
              </div>

              <div className="min-w-0 flex flex-col items-start">
                <h3 className="truncate text-[14px] font-bold leading-5 tracking-normal text-ink @4xl:text-[18px] @4xl:leading-7">
                  Today&apos;s Progress
                </h3>

                <p className="truncate text-[10px] font-semibold leading-4 tracking-normal text-muted @4xl:text-[14px] @4xl:leading-5">
                  {formatHours(completedMinutes)} / {formatHours(plannedMinutes)} completed
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2.2fr_1.1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {isFriday && (
            <div className="rounded-[24px] border border-brand/10 bg-surface p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0px_2px_8px_rgba(0,0,0,0.2)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-7 text-[#0D0E2B] dark:text-[#FAF7F2]!">Weekly Win Journal</p>
                  <p className="text-xs font-medium text-muted">
                    Weekly progress reflection & insights
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-full border border-tint-strong bg-tint-strong px-3 py-1.5 text-xs font-bold text-ink shadow-[0px_1px_2px_0px_#0000000D] dark:border-[#242453]! dark:bg-[#242453]!">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5" />
                  3% Ahead of Timeline
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-6 divide-x divide-brand/10 text-center">
                {JOURNAL_STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-2">
                    <p className="text-3xl font-extrabold leading-none text-[#0D0E2B] dark:text-[#FAF7F2]!">
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3">
                <Link
                  href="/home/journal"
                  className="text-sm font-bold text-ink"
                >
                  Explore Full Weekly Summary
                </Link>
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#333333] dark:text-[#FAF7F2]!">
                  Click to view details
                  <ArrowRightIcon />
                </span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-brand/10 bg-surface">
            <div className="flex flex-col items-start gap-3 border-b border-[#F3F4F6] pt-4 pr-6 pb-6 pl-6 sm:flex-row sm:items-center sm:justify-between dark:border-[#FAF7F214]">
              <div className="flex min-w-0 items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#6366F1] dark:bg-[#FAF7F2] dark:text-[#111145]">
                  <SparkleIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  {/* The coach's welcome step points here rather than at the
                      greeting — the plan is what it's introducing. */}
                  <p
                    data-coach="page-header"
                    className="w-fit text-[18px] leading-[18px] font-bold text-[#333333] dark:text-[#FAF7F2]"
                  >
                    AI Plan for Today
                  </p>
                  <p className="mt-1.5 text-[10px] leading-[15px] text-muted">
                    {plan?.aiSummary ?? "Generated at 6:00 AM • Based on your energy, backlog & revision schedule"}
                  </p>
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto sm:justify-start sm:gap-3">
                <button
                  type="button"
                  onClick={() => setRegenerateOpen(true)}
                  className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-[#E5E7EB] bg-surface px-2.5 py-1.5 text-[11px] font-bold text-[#333333] transition-colors hover:bg-tint sm:h-8.5 sm:px-4 sm:py-2 sm:text-xs dark:border-[#FAF7F2] dark:text-[#FAF7F2]"
                >
                  <RefreshIcon
                    width={14}
                    height={14}
                    className="shrink-0 sm:h-[15px] sm:w-[15px]"
                  />
                  <span>Regenerate Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddTaskOpen(true)}
                  className="flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-[#E5E7EB] bg-surface px-2.5 py-1.5 text-[11px] font-bold text-[#333333] transition-colors hover:bg-tint sm:h-8.5 sm:px-4 sm:py-2 sm:text-xs dark:border-[#FAF7F2] dark:text-[#FAF7F2]"
                >
                  <PlusIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                  <span>Add task</span>
                </button>
              </div>

            </div>

            <div className="p-5">
              {!plan && planLoadFailed ? (
                <p className="py-8 text-center text-sm text-muted">No plan available</p>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {planTasks.map((task, taskIndex) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        coachAnchor={taskIndex === 0 ? "start-session" : undefined}
                        onStartPractice={(taskId) => {
                          setPracticeTaskId(taskId);
                          setPracticeTaskStats({
                            estimatedMinutes: task.estimatedMinutes,
                            difficultyLabel: prettyDifficulty(task.difficulty),
                          });
                          setPracticeModalOpen(true);
                        }}
                        onTaskChanged={handleHomeTaskChanged}
                      />
                    ))}
                  </div>

                  <Link
                    href="/home/today-plan"
                    className="mt-4 block w-full text-center text-sm font-semibold text-ink underline"
                  >
                    View all
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-base font-bold text-ink">Quick Access</p>
            <div className="mt-4 flex flex-col gap-3">
              {QUICK_ACCESS.map((item) => {
                const content = (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                        {item.icon}
                      </span>
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-primary">
                          {item.label}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-muted">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <BackIcon className="h-[10px] w-[6px] shrink-0 text-secondary sm:h-[12px] sm:w-[7.4px]" />
                  </>
                );

                const classes =
                  "flex h-15 items-center justify-between rounded-xl border border-quick-access-border bg-card px-4 shadow-quick-access transition-colors hover:bg-tint";

                return (
                  <Link
                    key={item.label}
                    href={item.href as string}
                    className={classes}
                    data-coach={QUICK_ACCESS_COACH_ANCHOR[item.label]}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-brand/10 bg-surface p-4 sm:p-5 md:p-6 lg:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-(--oc-heading1) sm:text-lg">
                Study Consistency
              </h3>

              {/* The chevron itself is ~6x10px — far too small to tap — so the
                  link carries a 32px hit area. The negative margin keeps the
                  glyph aligned to the card's right edge as before. */}
              <Link
                href="/home/streak"
                aria-label="View streak details"
                className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-tint"
              >
                <BackIcon
                  className="h-[10px] w-[6px] shrink-0 text-secondary sm:h-[12px] sm:w-[7.4px]"
                />
              </Link>
            </div>

            {consistency ? (
              <div className="starting:opacity-0 transition-opacity duration-300">
                {/* Weekday labels */}
                <div
                  className="
          mx-auto
          mt-4
          grid
          w-full
          max-w-[300px]
          grid-cols-7
          sm:max-w-[340px]
          md:max-w-[420px]
          lg:max-w-[460px]
        "
                >
                  {CONSISTENCY_WEEKDAY_LABELS.map((day, index) => (
                    <span
                      key={index}
                      className="
              flex
              items-center
              justify-center
              text-[10px]
              font-medium
              leading-[15px]
              text-[#94A3B8]
              sm:text-xs
            "
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Consistency boxes */}
                <div
                  className="
          mx-auto
          mt-2
          flex
          w-full
          max-w-[300px]
          flex-col
          gap-y-1
          sm:max-w-[340px]
          sm:gap-y-1.5
          md:max-w-[420px]
          md:gap-y-2
          lg:max-w-[460px]
          lg:gap-y-2.5
        "
                >
                  {consistencyWeeks.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="grid w-full grid-cols-7"
                    >
                      {week.map((day, dayIndex) => (
                        <span
                          key={dayIndex}
                          className="flex items-center justify-center"
                        >
                          <span
                            title={
                              day
                                ? `${day.dayCompletionPercentage}% completed on ${day.date}`
                                : undefined
                            }
                            className="
                    aspect-square
                    w-[14px]
                    rounded-[3px]
                    sm:w-4
                    md:w-[18px]
                    md:rounded-[4px]
                    lg:w-5
                    lg:rounded-[4px]
                  "
                            style={{
                              backgroundColor: day
                                ? consistencyColors[
                                toActivityLevel(day.dayCompletionPercentage)
                                ]
                                : "transparent",
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div
                  className="
          mt-4
          flex
          items-center
          justify-between
          gap-3
          text-[10px]
          leading-[15px]
          text-muted
          sm:mt-5
          sm:text-xs
          md:mt-6
        "
                >
                  <span className="shrink-0">
                    {consistencyMonthName}
                  </span>

                  <span className="flex shrink-0 items-center gap-1">
                    <span>Missed</span>

                    <span className="flex items-center gap-1">
                      {consistencyColors.map((color, index) => (
                        <span
                          key={index}
                          className="
                  h-2
                  w-2
                  shrink-0
                  rounded-[2px]
                  sm:h-2.5
                  sm:w-2.5
                  sm:rounded-sm
                "
                          style={{
                            backgroundColor: color,
                          }}
                        />
                      ))}
                    </span>

                    <span>Completed</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex h-32 items-center justify-center text-xs text-muted">
                Loading...
              </div>
            )}
          </div>
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
      <QuickFocusModal open={isQuickFocusOpen} onClose={() => setQuickFocusOpen(false)} />
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
          router.push("/plan");
        }}
        secondaryLabel="Got it"
      />
      <WellnessResourceModal open={burnoutModal === "wellness"} onClose={dismissBurnoutModal} />
      <TodaysPracticeModal
        open={isPracticeModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        taskId={practiceTaskId}
        estimatedMinutes={practiceTaskStats?.estimatedMinutes}
        taskDifficultyLabel={practiceTaskStats?.difficultyLabel}
        onStart={() => {
          setPracticeModalOpen(false);
          router.push(practiceTaskId ? `/practice?taskId=${practiceTaskId}` : "/practice");
        }}
      />
      <RecoveryModeModal
        open={isRecoveryModeModalOpen}
        onClose={() => setRecoveryModeModalOpen(false)}
        onConfirm={handleActivateBacklogRecovery}
        isSubmitting={isActivatingBacklogRecovery}
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