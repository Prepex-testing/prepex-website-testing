"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { PageLoader } from "@/components/ui/PageLoader";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PartnerMatchModal } from "@/components/home/PartnerMatchModal";
import { GoalReflectionModal } from "@/components/home/GoalReflectionModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AlertTriangleIcon } from "@/components/ui/icons";
import {
  FlameIcon,
  ClockIcon,
  EncourageIcon,
  GoalIcon,
  Location,
  CheckIcons,
  CalendarIcon,
  CheckInIcon,
  CelebrateIcon,
  PushIcon,
  ArrowLeftIcon,
  BellIcon,
  LayersIcon,
  BoltIcon,
  Patners,
} from "@/assets/icons";
import {
  getPartnerStatus,
  findMatch,
  acceptMatch,
  declineMatch,
  requestRematch,
  disconnectPartner,
  getPartnerProfile,
  getPartnerInactivity,
  getMessageTemplates,
  getMessages,
  sendMessage,
  getWeeklyGoals,
  setGoalCompletionStatus,
  updatePartnerSettings,
  pausePartnership,
  type PartnershipStatusResponse,
  type PartnerProfile,
  type InactivityInfo,
  type TemplatesResponse,
  type PartnerMessage,
  type WeeklyGoals,
  type MessageCategory,
  type GoalCompletionStatus,
} from "@/lib/api/partner";

// The source SVGs carry fixed pixel width/height attributes, so they need an
// explicit class to scale with the chips that hold them.
const CATEGORY_ICON = "h-5 w-5 shrink-0 sm:h-6 sm:w-6";

const CATEGORY_META: Record<MessageCategory, { label: string; icon: React.ReactNode }> = {
  ENCOURAGE: { label: "Encourage", icon: <EncourageIcon className={CATEGORY_ICON} /> },
  GOAL_SHARE: { label: "Goal Share", icon: <GoalIcon className={CATEGORY_ICON} /> },
  PUSH_BACK: { label: "Push Back", icon: <PushIcon className={CATEGORY_ICON} /> },
  CHECK_IN: { label: "Check-In", icon: <Patners className={CATEGORY_ICON} /> },
  CELEBRATE: { label: "Celebrate", icon: <CelebrateIcon className={CATEGORY_ICON} /> },
};

const CATEGORY_ORDER: MessageCategory[] = [
  "ENCOURAGE",
  "GOAL_SHARE",
  "PUSH_BACK",
  "CHECK_IN",
  "CELEBRATE",
];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)} hrs`;
}

export default function PartnerPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PartnershipStatusResponse | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [inactivity, setInactivity] = useState<InactivityInfo | null>(null);
  const [templates, setTemplates] = useState<TemplatesResponse | null>(null);
  const [messages, setMessages] = useState<PartnerMessage[]>([]);
  const [goals, setGoals] = useState<WeeklyGoals | null>(null);

  const [findError, setFindError] = useState<string | null>(null);
  const [isFinding, setFinding] = useState(false);
  const [isMatchOpen, setMatchOpen] = useState(false);
  const [isMatchSubmitting, setMatchSubmitting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  // Sunday: prompt to set a goal if not already set — OK navigates to the
  // weekly-goal page. Friday: prompt to reflect on the goal already set.
  const [isSundayPromptOpen, setSundayPromptOpen] = useState(false);
  const [isReflectionOpen, setReflectionOpen] = useState(false);
  const [isReflectionSubmitting, setReflectionSubmitting] = useState(false);
  const hasPromptedSunday = useRef(false);
  const hasPromptedReflection = useRef(false);

  const [category, setCategory] = useState<MessageCategory>("ENCOURAGE");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [isDisconnectOpen, setDisconnectOpen] = useState(false);
  const [isDisconnecting, setDisconnecting] = useState(false);
  const [isRematching, setRematching] = useState(false);

  const isSunday = new Date().getDay() === 2; //0
  const isFriday = new Date().getDay() === 2;  //5

  const loadActivePartnerData = useCallback(async () => {
    const [profileRes, inactivityRes, templatesRes, messagesRes, goalsRes] = await Promise.allSettled([
      getPartnerProfile(),
      getPartnerInactivity(),
      getMessageTemplates(),
      getMessages(20),
      getWeeklyGoals(),
    ]);
    if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
    if (inactivityRes.status === "fulfilled") setInactivity(inactivityRes.value.data);
    if (templatesRes.status === "fulfilled") setTemplates(templatesRes.value.data);
    if (messagesRes.status === "fulfilled") setMessages(messagesRes.value.data);
    if (goalsRes.status === "fulfilled") {
      const goalsData = goalsRes.value.data;
      setGoals(goalsData);

      // PRD 6.6.1 — Sunday nudge if no goal set yet this week.
      if (isSunday && !goalsData.myGoal && !hasPromptedSunday.current) {
        hasPromptedSunday.current = true;
        setSundayPromptOpen(true);
      }
      // PRD 6.6.2 — Friday "Goal hit?" check-in once a goal is set.
      if (isFriday && goalsData.myGoal && goalsData.myStatus === null && !hasPromptedReflection.current) {
        hasPromptedReflection.current = true;
        setReflectionOpen(true);
      }
    }
  }, [isSunday, isFriday]);

  const refetchStatus = useCallback(async () => {
    const { data } = await getPartnerStatus();
    setStatus(data);

    if (data.status === "PENDING") {
      setMatchOpen(true);
      setWaitingForPartner(Boolean(data.meAccepted && !data.partnerAccepted));
    } else {
      setMatchOpen(false);
      setWaitingForPartner(false);
    }

    if (data.status === "ACTIVE" || data.status === "PAUSED") {
      await loadActivePartnerData();
    } else {
      setProfile(null);
      setInactivity(null);
      setMessages([]);
      setGoals(null);
    }
    return data;
  }, [loadActivePartnerData]);

  useEffect(() => {
    refetchStatus().finally(() => setLoading(false));
  }, [refetchStatus]);

  const handleFindMatch = async () => {
    setFinding(true);
    setFindError(null);
    try {
      const { data } = await findMatch();
      if (data.matched) {
        await refetchStatus();
      } else {
        setFindError(data.message);
      }
    } catch (err) {
      setFindError(err instanceof Error ? err.message : "Couldn't find a match right now.");
    } finally {
      setFinding(false);
    }
  };

  const handleAccept = async () => {
    setMatchSubmitting(true);
    try {
      await acceptMatch();
      await refetchStatus();
    } catch {
      // Best-effort — the modal stays open so the student can retry.
    } finally {
      setMatchSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setMatchSubmitting(true);
    try {
      await declineMatch();
      setMatchOpen(false);
      await refetchStatus();
    } catch {
      // Best-effort — the modal stays open so the student can retry.
    } finally {
      setMatchSubmitting(false);
    }
  };

  const handleReflect = async (goalStatus: GoalCompletionStatus) => {
    setReflectionSubmitting(true);
    try {
      await setGoalCompletionStatus(goalStatus);
      const { data } = await getWeeklyGoals();
      setGoals(data);
      setReflectionOpen(false);
    } catch {
      // Best-effort — the popup stays open so the student can retry.
    } finally {
      setReflectionSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!templateId) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage({ category, templateId });
      setTemplateId(null);
      const { data } = await getMessages(20);
      setMessages(data);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send that. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickCheckIn = async () => {
    const checkInTemplate = templates?.templates.CHECK_IN[0];
    if (!checkInTemplate) return;
    try {
      await sendMessage({ category: "CHECK_IN", templateId: checkInTemplate.id });
      const { data } = await getMessages(20);
      setMessages(data);
      const { data: inactivityData } = await getPartnerInactivity();
      setInactivity(inactivityData);
    } catch {
      // Best-effort.
    }
  };

  const handleRematch = async () => {
    setRematching(true);
    try {
      await requestRematch();
      await refetchStatus();
    } catch {
      // Best-effort — inactivity banner stays up so the student can retry.
    } finally {
      setRematching(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectPartner();
      setDisconnectOpen(false);
      await refetchStatus();
    } catch {
      // Best-effort.
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleMessaging = async () => {
    if (!status?.settings) return;
    await updatePartnerSettings({ messagingEnabled: !status.settings.messagingEnabled }).catch(() => { });
    await refetchStatus();
  };

  const toggleHideCompletion = async () => {
    if (!status?.settings) return;
    await updatePartnerSettings({ hideCompletionPct: !status.settings.hideCompletionPct }).catch(() => { });
    await refetchStatus();
  };

  const togglePause = async () => {
    if (!status?.settings) return;
    if (status.settings.pausedUntil) {
      await pausePartnership().catch(() => { });
    } else {
      await pausePartnership(1).catch(() => { });
    }
    await refetchStatus();
  };

  if (loading) return <PageLoader label="Loading your partner…" />;

  const headerBar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/home" aria-label="Back to Home" className="text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-h1 text-ink">Partner</h1>
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

  // -------------------------------------------------------------------------
  // No partner yet
  // -------------------------------------------------------------------------
  if (!status || status.status === "NONE") {
    const { eligibility } = status ?? { eligibility: null };

    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {headerBar}

        <div className="flex flex-col items-center gap-4 rounded-3xl border border-brand/10 bg-surface p-10 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-ink">
            <LayersIcon />
          </span>
          <h2 className="text-h2 text-ink">Find an Accountability Partner</h2>
          <p className="max-w-md text-sm text-muted">
            One real partner, matched by exam target, prep stage, and daily hours. See each
            other&apos;s effort, exchange one purposeful message a day.
          </p>

          {eligibility && !eligibility.eligibleForMatching ? (
            <p className="rounded-xl bg-tint-strong px-4 py-3 text-sm font-semibold text-ink">
              Partner matching activates {eligibility.daysUntilEligible} day
              {eligibility.daysUntilEligible === 1 ? "" : "s"} from now — we&apos;re still
              learning your study patterns.
            </p>
          ) : eligibility && !eligibility.declines.canDecline ? (
            <p className="rounded-xl bg-tint-strong px-4 py-3 text-sm font-semibold text-ink">
              You&apos;ve reached your decline limit. Contact support for a manual review.
            </p>
          ) : (
            <Button variant="primary" onClick={handleFindMatch} disabled={isFinding} className="mt-2 w-auto px-8">
              {isFinding ? "Searching…" : "Find a Partner"}
            </Button>
          )}

          {findError && <p className="max-w-md text-sm text-warning">{findError}</p>}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Pending match (accept/decline)
  // -------------------------------------------------------------------------
  if (status.status === "PENDING") {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {headerBar}

        <div className="flex flex-col items-center gap-3 rounded-3xl border border-brand/10 bg-surface p-10 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-ink">
            <LayersIcon />
          </span>
          {waitingForPartner ? (
            <>
              <h2 className="text-h2 text-ink">Waiting for {status.partner?.fullName ?? "your match"}</h2>
              <p className="max-w-md text-sm text-muted">
                You&apos;ve accepted — we&apos;ll activate this partnership as soon as they do too.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-h2 text-ink">Review your proposed partner</h2>
              <p className="max-w-md text-sm text-muted">Reopen the match card to accept or decline.</p>
              <Button variant="primary" onClick={() => setMatchOpen(true)} className="mt-2 w-auto px-8">
                View match
              </Button>
            </>
          )}
        </div>

        <PartnerMatchModal
          open={isMatchOpen}
          onClose={() => setMatchOpen(false)}
          onAccept={handleAccept}
          onDecline={handleDecline}
          partner={status.partner}
          isSubmitting={isMatchSubmitting}
          declinesRemaining={status.eligibility.declines.remaining}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Active (or paused) partnership
  // -------------------------------------------------------------------------
  const partner = status.partner;
  const isPaused = status.status === "PAUSED" || Boolean(status.settings?.pausedUntil);

  // Each stat icon sits in a 24×24 frame with the glyph at 18×18 — a 3px inset
  // on every side. The flame keeps its 27:30 ratio, so 18 wide makes it 20.25
  // tall (a ~2px top inset). The check and clock SVGs carry more internal
  // padding than the calendar, so they get a larger box to read at the same
  // optical size. All step down one notch below `sm` to stay compact on mobile.
  const STAT_ICON = "h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]";
  const STAT_ICON_LG = "h-[18px] w-[18px] sm:h-[21.5px] sm:w-[21.5px]";
  const STAT_FLAME_ICON = "h-[16.875px] w-[15px] sm:h-[20.25px] sm:w-[18px]";

  // Progress-bar fills. `todayCompletionPct` is nullable when the partner keeps
  // it hidden; the bar renders empty in that case.
  const todayCompletionPct = profile?.todayCompletionPct ?? null;
  const weeklyConsistencyPct = profile ? Math.round((profile.daysActiveThisWeek / 7) * 100) : 0;

  const statCards = [
    { value: `${profile?.currentStreak ?? partner?.streak ?? 0}`, label: "Day Streak", icon: <FlameIcon className={STAT_FLAME_ICON} /> },
    {
      value: profile?.todayCompletionPct !== null && profile?.todayCompletionPct !== undefined ? `${profile.todayCompletionPct}%` : "—",
      label: "Completion",
      icon: <CheckIcons className={STAT_ICON_LG} />,
    },
    { value: `${profile?.daysActiveThisWeek ?? 0}/7`, label: "Days Active", icon: <CalendarIcon className={STAT_ICON} /> },
    { value: profile?.daysToExam !== null && profile?.daysToExam !== undefined ? `${profile.daysToExam}` : "—", label: "Days left", icon: <ClockIcon className={STAT_ICON_LG} /> },
  ];

  const availableTemplates = templates?.templates[category] ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {headerBar}

      {inactivity?.suggestion && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
              <AlertTriangleIcon />
            </span>
            <p className="min-w-0 break-words text-sm font-semibold text-ink">{inactivity.suggestion}</p>
          </div>
          {inactivity.suggestedAction === "check_in" && (
            <Button variant="secondary" size="sm" onClick={handleQuickCheckIn} className="w-auto shrink-0">
              Send check-in
            </Button>
          )}
          {inactivity.suggestedAction === "rematch" && (
            <Button variant="secondary" size="sm" onClick={handleRematch} disabled={isRematching} className="w-auto shrink-0">
              {isRematching ? "Finding…" : "Yes, re-match"}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-brand/10 bg-surface p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-brand/10 text-xl font-extrabold sm:h-20 sm:w-20 sm:text-2xl ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
              >
                {partner?.fullName?.trim()?.[0]?.toUpperCase() ?? "?"}
              </div>

              <div className="min-w-0 w-full sm:w-auto">
                <span className="inline-flex rounded-md bg-tint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-ink">
                  YOUR PARTNER
                </span>

                <h2 className="mt-2 break-words text-[20px] font-bold leading-7 text-ink sm:text-[24px] sm:leading-8">
                  {partner?.fullName ?? "—"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-ink">
                  {isPaused
                    ? "Connection paused"
                    : inactivity?.partnerInactiveDays === 0
                      ? `${partner?.fullName ?? "Your partner"} is active today`
                      : inactivity?.partnerInactiveDays
                        ? `Last active ${inactivity.partnerInactiveDays}d ago`
                        : ""}
                </p>

                <p className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted sm:justify-start sm:gap-4">
                  {partner?.city && (
                    <span className="flex items-center gap-1">
                      <Location className="h-4 w-4 shrink-0" />
                      {partner.city}
                    </span>
                  )}

                  {partner?.examName && <span>{partner.examName}</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm transition-colors sm:gap-4 sm:p-5 xl:p-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink sm:h-12 sm:w-12 dark:bg-[#FAF7F2]/8">
                  <span className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
                    {stat.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[28px] font-extrabold leading-none text-ink sm:text-[32px] xl:text-[36px]">
                    {stat.value}
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-brand/10 bg-surface p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand/10 bg-tint shadow-sm sm:h-16 sm:w-16">
              <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[18px] font-semibold leading-none text-ink">Goal Setting Sunday</h3>
              {goals?.bothSet ? (
                <div className="mt-3 flex flex-col gap-1 text-sm">
                  <p className="text-muted">
                    View and update your weekly goal, and see how your partner is doing.
                  </p>
                </div>
              ) : goals?.myGoal ? (
                <p className="mt-3 max-w-[520px] text-sm leading-5 text-muted">
                  Your goal is set: <span className="font-semibold text-ink">{goals.myGoal}</span>. Waiting on{" "}
                  {partner?.fullName ?? "your partner"}.
                </p>
              ) : (
                <p className="mt-3 max-w-[520px] text-sm leading-5 text-muted">
                  Set a meaningful goal for the week ahead and stay accountable together.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:items-start lg:items-end">
            <Button
              variant="primary"
              onClick={() => router.push("/home/partner/weekly-goal")}
              className="h-12 rounded-xl border border-brand bg-transparent! px-6 text-sm font-bold text-ink! hover:bg-cta! hover:text-white! sm:px-8 sm:text-base"
            >
              {goals?.myGoal ? "View Weekly Goal" : "Set Weekly Goal"}
            </Button>
            <p className="text-center text-[11px] italic text-muted lg:text-right">
              Setting a goal is only available on Sundays
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-5">
          <p className="text-sm font-bold text-ink">Partner&apos;s Focus This Week</p>
          <p className="mt-4 text-3xl font-extrabold text-ink">
            {profile ? formatHours(profile.focusSecondsThisWeek) : "—"}
          </p>
          <div className="mt-3 h-2 w-full max-w-full rounded-full bg-tint-strong sm:h-2.5 md:h-3">
            <div
              className="h-2 rounded-full bg-brand transition-[width] dark:bg-[#FAF7F2] sm:h-2.5 md:h-3"
              style={{ width: `${weeklyConsistencyPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink">
            {profile ? `Active ${profile.daysActiveThisWeek} of 7 days this week` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            <BoltIcon className="h-4 w-4 shrink-0" />
            Partner Pulse
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className={`flex items-center justify-between text-xs ${isDark ? "text-white" : "text-[#64748B]"}`}>
                <span className="font-semibold">Focus Today</span>
                <span>
                  {todayCompletionPct !== null ? `${todayCompletionPct}%` : "Hidden"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-tint-strong">
                <div
                  className="h-2 rounded-full bg-brand transition-[width] dark:bg-[#FAF7F2]"
                  style={{ width: `${todayCompletionPct ?? 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className={`flex items-center justify-between text-xs ${isDark ? "text-white" : "text-[#64748B]"}`}>
                <span className="font-semibold">Weekly Consistency</span>
                <span>{profile ? `${weeklyConsistencyPct}%` : "—"}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-tint-strong">
                <div
                  className="h-2 rounded-full bg-brand transition-[width] dark:bg-[#FAF7F2]"
                  style={{ width: `${weeklyConsistencyPct}%` }}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between text-xs ${isDark ? "text-white" : "text-[#64748B]"}`}>
              <span>Last Active</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {inactivity?.partnerInactiveDays === 0
                  ? "Today"
                  : inactivity?.partnerInactiveDays
                    ? `${inactivity.partnerInactiveDays}d ago`
                    : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="flex w-full min-w-0 flex-col rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-5 md:p-6 lg:p-6 xl:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-ink sm:text-lg">Recent Signals</h2>
          </div>

          <div className="mt-5 flex flex-col gap-4 sm:mt-6 sm:gap-5">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">No signals yet — send the first one.</p>
            ) : (
              messages.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-2.5 border-b border-brand/10 pb-4 last:border-0 last:pb-0 sm:gap-3 sm:pb-5 md:gap-4"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${isDark ? "bg-[#FAF7F2]/8 text-[#FAF7F2]" : "bg-[#EEF0F8] text-[#1A1A4E]"}`}
                  >
                    {CATEGORY_META[signal.category].icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <p className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wider text-muted sm:text-[10px]">
                        {signal.isMine ? "You" : partner?.fullName ?? "Partner"} · {CATEGORY_META[signal.category].label}
                      </p>

                      <span className="shrink-0 text-[10px] text-muted sm:text-xs">
                        {timeAgo(signal.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 break-words text-[13px] font-bold leading-5 text-ink sm:text-sm sm:leading-6 md:text-base">
                      {signal.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-5 md:p-6 lg:p-6 xl:p-8">
          <h2 className="text-base font-bold text-ink sm:text-lg">Send Signal</h2>

          <p className="mt-1 text-xs text-muted sm:text-sm">
            Choose a signal type
          </p>

          <div className="mt-4 grid w-full grid-cols-5 gap-x-1 gap-y-3 sm:mt-5 sm:gap-x-2 sm:gap-y-4 md:gap-3 lg:gap-x-1.5 lg:gap-y-3 xl:gap-3">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setTemplateId(null);
                }}
                aria-pressed={category === cat}
                className="flex min-w-0 flex-col items-center gap-1 sm:gap-1.5 md:gap-2"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10 sm:rounded-xl md:h-14 md:w-14 lg:h-10 lg:w-10 xl:h-14 xl:w-14 ${isDark ? "bg-[#FAF7F2]/8 text-[#FAF7F2]" : "bg-[#EEF0F8] text-[#1A1A4E]"} ${category === cat ? `ring-2 ring-offset-1 ring-offset-surface md:ring-offset-2 ${isDark ? "ring-[#FAF7F2]" : "ring-brand"}` : ""}`}
                >
                  {CATEGORY_META[cat].icon}
                </div>

                <span className="w-full whitespace-nowrap text-center font-[Plus_Jakarta_Sans] text-[8px] font-semibold leading-[100%] tracking-[0%] text-ink sm:text-[10px] md:text-[12px] lg:text-[10px] xl:text-[12px]">
                  {CATEGORY_META[cat].label}
                </span>
              </button>
            ))}
          </div>

          <h3 className="mt-6 font-[Plus_Jakarta_Sans] text-[13px] font-bold leading-[100%] tracking-[0%] text-ink sm:mt-7 sm:text-[14px] md:mt-8 md:text-[16px]">
            Choose a message
          </h3>

          <div className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:gap-3">
            {availableTemplates.length === 0 ? (
              <p className="text-sm text-muted">Loading templates…</p>
            ) : (
              availableTemplates.map((option) => (
                <RadioOption
                  key={option.id}
                  name="partner-message-template"
                  value={option.id}
                  label={option.text}
                  selected={templateId === option.id}
                  onSelect={() => setTemplateId(option.id)}
                  labelClassName="text-[12px] font-semibold leading-[100%] tracking-normal sm:text-[13px] md:text-[14px]"
                />
              ))
            )}
          </div>

          {sendError && (
            <p className="mt-3 text-xs text-warning sm:text-sm">
              {sendError}
            </p>
          )}

          <Button
            variant="primary"
            className="mt-6 h-10 w-full rounded-xl text-xs font-bold sm:mt-8 sm:h-12 sm:text-sm md:mt-10 md:h-14 md:text-base"
            onClick={handleSend}
            disabled={!templateId || isSending || !status.settings?.messagingEnabled}
          >
            {isSending ? "Sending…" : "Send Signal"}
          </Button>

          {status.settings && !status.settings.messagingEnabled && (
            <p className="mt-2 text-center text-[10px] text-muted sm:text-xs">
              You&apos;ve disabled messaging in settings.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-6 lg:p-8">
        <h2 className="text-base font-bold text-ink sm:text-lg">Settings</h2>

        <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Allow messages</p>
              <p className="text-xs leading-5 text-muted">Disable to pause messaging both ways.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleMessaging} className="w-full shrink-0 sm:w-auto">
              {status.settings?.messagingEnabled ? "On" : "Off"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Hide my completion %</p>
              <p className="text-xs leading-5 text-muted">Partner sees only that you were active today.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={toggleHideCompletion} className="w-full shrink-0 sm:w-auto">
              {status.settings?.hideCompletionPct ? "Hidden" : "Visible"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Pause connection</p>
              <p className="text-xs leading-5 text-muted">
                {status.settings?.pausedUntil
                  ? `Paused until ${new Date(status.settings.pausedUntil).toLocaleDateString()}`
                  : "Temporary pause for 1–4 weeks."}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={togglePause} className="w-full shrink-0 sm:w-auto">
              {status.settings?.pausedUntil ? "Resume" : "Pause 1 week"}
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-brand/10 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Disconnect partner</p>
              <p className="text-xs leading-5 text-muted">Permanent. 30-day cooldown before a new match.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDisconnectOpen(true)}
              className="w-full shrink-0 border-[#F59E0B]! text-[#F59E0B]! hover:bg-[#F59E0B33]! sm:w-auto"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={isDisconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect your partner?"
        description="This ends the connection immediately. You'll wait 30 days before a new match — your partner can be matched again right away."
        confirmLabel={isDisconnecting ? "Disconnecting…" : "Yes, disconnect"}
      />

      <ConfirmModal
        open={isSundayPromptOpen}
        onClose={() => setSundayPromptOpen(false)}
        onConfirm={() => {
          setSundayPromptOpen(false);
          router.push("/home/partner/weekly-goal");
        }}
        title="Goal Setting Sunday"
        description={`Set this week's goal with ${partner?.fullName ?? "your partner"}.`}
        confirmLabel="Set my goal"
        cancelLabel="Not now"
      />

      <GoalReflectionModal
        open={isReflectionOpen}
        onClose={() => setReflectionOpen(false)}
        onSelect={handleReflect}
        goal={goals?.myGoal}
        isSubmitting={isReflectionSubmitting}
      />
    </div>
  );
}
