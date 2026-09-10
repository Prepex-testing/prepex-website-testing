"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { GoalSettingModal } from "@/components/home/GoalSettingModal";
import { CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import { ArrowLeftIcon } from "@/assets/icons";
import {
  getPartnerStatus,
  getWeeklyGoals,
  setWeeklyGoal,
  setGoalCompletionStatus,
  type PartnershipStatusResponse,
  type WeeklyGoals,
  type GoalCompletionStatus,
} from "@/lib/api/partner";

const STATUS_LABEL: Record<GoalCompletionStatus, string> = {
  NOT_COMPLETE: "Not complete",
  PARTIAL: "Partially complete",
  COMPLETE: "Complete",
};

const STATUS_STYLE: Record<GoalCompletionStatus, string> = {
  NOT_COMPLETE: "bg-[#F59E0B1A] text-[#F59E0B]",
  PARTIAL: "bg-tint-strong text-ink",
  COMPLETE: "bg-success/10 text-success",
};

const REFLECTION_OPTIONS: { status: GoalCompletionStatus; label: string }[] = [
  { status: "NOT_COMPLETE", label: "Not complete" },
  { status: "PARTIAL", label: "Partially complete" },
  { status: "COMPLETE", label: "Complete" },
];

type GoalItem = { text: string; topics?: string[] };

// GoalSettingModal composes multiple selections into one string, joined by
// " • " — e.g. "Finish Thermodynamics, Organic Chemistry • Hit 6 focus hours
// total". Split that back into a list, and split a multi-topic "Finish ..."
// entry further into a topics sub-list.
function parseGoalItems(goal: string | null): GoalItem[] {
  if (!goal) return [];
  return goal
    .split(" • ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const finishMatch = part.match(/^Finish (.+)$/);
      if (finishMatch) {
        const topics = finishMatch[1]
          .split(", ")
          .map((t) => t.trim())
          .filter(Boolean);
        if (topics.length > 1) return { text: "Finish", topics };
      }
      return { text: part };
    });
}

function GoalList({ goal }: { goal: string | null }) {
  const items = parseGoalItems(goal);
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index}>
          <div className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
            <span className="text-base font-bold text-ink">{item.text}</span>
          </div>
          {item.topics && (
            <ul className="ml-5 mt-1 flex flex-col gap-1">
              {item.topics.map((topic, topicIndex) => (
                <li key={topicIndex} className="flex items-start gap-2 text-sm text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  {topic}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function WeeklyGoalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PartnershipStatusResponse | null>(null);
  const [goals, setGoals] = useState<WeeklyGoals | null>(null);
  const [isGoalOpen, setGoalOpen] = useState(false);
  const [isGoalSubmitting, setGoalSubmitting] = useState(false);
  const [isReflecting, setReflecting] = useState<GoalCompletionStatus | null>(null);

  const isSunday = new Date().getDay() === 3; //0
  // Friday through Saturday — reflection window for the week just ending.
  const isReflectionWindow = new Date().getDay() >= 3; //5

  const load = useCallback(async () => {
    const [statusRes, goalsRes] = await Promise.allSettled([getPartnerStatus(), getWeeklyGoals()]);
    if (statusRes.status === "fulfilled") setStatus(statusRes.value.data);
    if (goalsRes.status === "fulfilled") setGoals(goalsRes.value.data);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSetGoal = async (goal: string) => {
    setGoalSubmitting(true);
    try {
      await setWeeklyGoal(goal);
      const { data } = await getWeeklyGoals();
      setGoals(data);
      setGoalOpen(false);
    } catch {
      // Best-effort — modal stays open so the student can retry.
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleReflect = async (goalStatus: GoalCompletionStatus) => {
    setReflecting(goalStatus);
    try {
      await setGoalCompletionStatus(goalStatus);
      const { data } = await getWeeklyGoals();
      setGoals(data);
    } catch {
      // Best-effort.
    } finally {
      setReflecting(null);
    }
  };

  if (loading) return <PageLoader label="Loading weekly goal…" />;

  const partner = status?.partner;
  const hasPartner = status?.status === "ACTIVE" || status?.status === "PAUSED";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/partner" aria-label="Back to Partner" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Weekly Goal</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {!hasPartner ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-brand/10 bg-surface p-10 text-center shadow-sm">
          <p className="text-h2 text-ink">No active partner</p>
          <p className="max-w-md text-sm text-muted">
            Weekly goals are shared with your accountability partner — match with one first.
          </p>
          <Button variant="primary" onClick={() => router.push("/home/partner")} className="mt-2 w-auto px-8">
            Back to Partner
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Your goal</p>
              {goals?.myGoal ? (
                <>
                  <GoalList goal={goals.myGoal} />
                  {goals.myStatus && (
                    <span
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[goals.myStatus]}`}
                    >
                      <CheckCircleIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 md:h-[15.5px] md:w-[13.5px]" />
                      {STATUS_LABEL[goals.myStatus]}
                    </span>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Not set for this week yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                {partner?.fullName ?? "Partner"}&apos;s goal
              </p>
              {goals?.partnerGoal ? (
                <>
                  <GoalList goal={goals.partnerGoal} />
                  {goals.partnerStatus && (
                    <span
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[goals.partnerStatus]}`}
                    >
                      <CheckCircleIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 md:h-[15.5px] md:w-[13.5px]" />
                      {STATUS_LABEL[goals.partnerStatus]}
                    </span>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Waiting on {partner?.fullName ?? "your partner"}.</p>
              )}
            </div>
          </div>

          {isReflectionWindow && goals?.bothSet && goals.myGoal && goals.myStatus === null && (
            <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                  <ClockIcon />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Did you hit your goal this week?</p>
                  <p className="text-xs text-muted">This is shared with {partner?.fullName ?? "your partner"}.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {REFLECTION_OPTIONS.map((option) => (
                  <Button
                    key={option.status}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReflect(option.status)}
                    disabled={isReflecting !== null}
                    className="w-auto"
                  >
                    {isReflecting === option.status ? "Saving…" : option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand/10 bg-surface p-6 text-center shadow-sm">
            <Button
              variant="primary"
              onClick={() => setGoalOpen(true)}
              disabled={!isSunday}
              className="w-auto px-8"
            >
              {goals?.myGoal ? "Update Goal" : "Set Weekly Goal"}
            </Button>
            <p className="text-xs italic text-muted">Only available on Sundays</p>
          </div>

          <GoalSettingModal
            open={isGoalOpen}
            onClose={() => setGoalOpen(false)}
            onSubmit={handleSetGoal}
            partnerName={partner?.fullName}
            isSubmitting={isGoalSubmitting}
          />
        </>
      )}
    </div>
  );
}
