"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LoderIcon } from "@/assets/icons";
import { getBadDayWelcome, acknowledgeBadDay, type BadDayWelcome } from "@/lib/api/checkin";

/**
 * Section 4.3.2 — the Bad Day welcome screen. Shown once when a student
 * returns after 2+ inactive days. Judgment-free: no backlog count, no
 * "you missed X" (Section 4.3.4 / 4.7). Partner line is out of scope for now.
 *
 * Rendered as a full-screen layer over the app shell, styled to match the
 * auth screens (centered card, logo, single primary CTA).
 */
export default function BadDayPage() {
  const router = useRouter();
  const [data, setData] = useState<BadDayWelcome | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showMoreTasks, setShowMoreTasks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBadDayWelcome()
      .then(({ data }) => {
        if (cancelled) return;
        // Already handled elsewhere — don't trap the user here.
        if (!data.isBadDayReturn || data.acknowledged) {
          router.replace("/home");
          return;
        }
        setData(data);
      })
      .catch(() => {
        if (!cancelled) router.replace("/home");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleStartFresh = async () => {
    setStarting(true);
    try {
      await acknowledgeBadDay();
    } catch {
      // Best-effort — still take the student into their day.
    } finally {
      router.replace("/home");
    }
  };

  if (!loaded || !data) {
    return (
      <div className="fixed inset-0 z-[60] bg-background">
        <AuthCard>
          <div className="flex justify-center py-10">
            <LoderIcon className="h-10 w-10 animate-spin text-ink" />
          </div>
        </AuthCard>
      </div>
    );
  }

  const [firstTask, ...restTasks] = data.welcome.tasks;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <AuthCard>
        {/* HEADER */}
        <div className="flex flex-col items-center gap-1">
          <Logo size="compact" />
        </div>

        {/* BODY */}
        <div className="mt-10 flex flex-col items-center gap-6 sm:mt-14 sm:gap-8">
          {/* TITLE BLOCK */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.48px] text-ink sm:text-[32px] sm:leading-[40px] sm:tracking-[-0.64px]">
              Hey {data.welcome.firstName}.
            </h1>
            <p className="max-w-[320px] text-center text-[14px] font-normal leading-[20px] text-muted sm:max-w-[440px] sm:text-[16px] sm:leading-[24px]">
              You took a break. That&apos;s completely okay. Every JEE warrior has
              tough days — what matters is showing up again.
            </p>
          </div>

          {/* TASK + CTA BLOCK */}
          <div className="flex w-full max-w-[465px] flex-col items-center gap-5 sm:gap-6">
            <p className="text-center text-[14px] font-semibold leading-[20px] text-ink sm:text-[16px]">
              Let&apos;s start fresh today. Just a few small tasks.
            </p>

            {firstTask && (
              <div className="w-full rounded-2xl border border-brand/10 bg-background p-5 text-left shadow-[0_1px_2px_0_rgba(26,26,78,0.06)]">
                <p className="text-[15px] font-bold leading-[22px] text-ink">
                  {firstTask.title}
                </p>
                {firstTask.description && (
                  <p className="mt-1 text-[13px] leading-[18px] text-muted">
                    {firstTask.description}
                  </p>
                )}
                <p className="mt-3 text-[13px] font-semibold text-brand">
                  {firstTask.estimatedMinutes} min · You&apos;ve got this
                </p>
              </div>
            )}

            {restTasks.length > 0 && (
              <button
                onClick={() => setShowMoreTasks(!showMoreTasks)}
                className="text-left text-[13px] leading-[18px] text-muted transition hover:text-ink"
              >
                {showMoreTasks ? "Show less" : `${restTasks.length} more easy ${restTasks.length === 1 ? "task" : "tasks"} below.`}
              </button>
            )}

            {showMoreTasks && restTasks.length > 0 && (
              <div className="w-full space-y-3">
                {restTasks.map((task, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-brand/10 bg-background p-5 text-left shadow-[0_1px_2px_0_rgba(26,26,78,0.06)]"
                  >
                    <p className="text-[15px] font-bold leading-[22px] text-ink">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-1 text-[13px] leading-[18px] text-muted">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-3 text-[13px] font-semibold text-brand">
                      {task.estimatedMinutes} min · You&apos;ve got this
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleStartFresh}
              disabled={starting}
              className="h-[52px] w-full rounded-2xl text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:h-[57px] sm:text-[16px]"
            >
              {starting ? "Starting..." : "Start fresh"}
            </Button>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}
