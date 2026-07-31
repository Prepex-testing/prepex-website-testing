"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OutlineChip } from "@/components/ui/OutlineChip";
import { GoogleIcon, CheckIcon } from "@/components/ui/icons";
import { getGoogleAuthUrl } from "@/lib/api/auth";

const PREVIEW_TASKS = [
  {
    title: "Kinematics Practice",
    meta: "Physics · 45 mins",
    badge: "GO",
  },
  {
    title: "Mole Concept Done",
    meta: "Chemistry · Completed",
  },
];

const HIGHLIGHTS = [
  "AI Daily Plans",
  "Burnout Detection",
  "Smart Revision",
];

export default function WelcomePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      <div
        className="
          w-full
          max-w-[747px]
          rounded-2xl
          bg-surface
          px-6
          py-10
          shadow-modal
          sm:rounded-[24px]
          sm:px-[60px]
          sm:py-[60px]
        "
      >
        <div className="mx-auto flex w-full max-w-[627px] flex-col items-center gap-8">
          {/* Logo */}
          <Logo size="compact" />

          {/* Stats Card */}
          <div
            className="
              flex
              w-full
              max-w-[448px]
              flex-col
              gap-3
              rounded-[24px]
              border
              border-tint-strong
              bg-[linear-gradient(122.03deg,#EEF0F8_0%,#FFFFFF_100%)]
              p-5
              shadow-[0_1px_2px_rgba(0,0,0,0.05)]
              dark:border-[#242453]
              dark:bg-[#13133D]
              dark:bg-none
              sm:gap-4
              sm:p-6
            "
          >
            {/* Stats */}
            <div className="flex w-full gap-3 sm:gap-4">
              <div className="flex h-[95px] flex-1 flex-col items-center justify-center rounded-2xl border border-stats-card-border bg-stats-card-bg">
                <p className="text-[28px] font-extrabold leading-none text-ink sm:text-[32px]">
                  12
                </p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted">
                  Streak
                </p>
              </div>

              <div className="flex h-[95px] flex-1 flex-col items-center justify-center rounded-2xl border border-stats-card-border bg-stats-card-bg">
                <p className="text-[28px] font-extrabold leading-none text-ink sm:text-[32px]">
                  4 / 6
                </p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted">
                  Tasks
                </p>
              </div>
            </div>

            {/* Task List */}
            <div className="mt-3 flex flex-col gap-2">
              {/* Kinematics Practice */}
              <div
                className="
      flex h-[54px] items-center justify-between
      rounded-xl border border-[#F3F4F6]
      bg-surface px-3
      dark:border-[#242453]
      dark:bg-surface
    "
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="
    flex h-4 w-4 shrink-0 items-center justify-center
    rounded-full
    bg-ink
    text-white
    dark:bg-[#F0EDE5]
    dark:text-[#111145]
  "
                  >
                    <CheckIcon className="h-[10px] w-[10px]" />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold leading-none text-ink">
                      Kinematics Practice
                    </p>

                    <p className="mt-1 text-[11px] leading-none text-muted">
                      Physics · 45 mins
                    </p>
                  </div>
                </div>

                <span
                  className="
        flex h-5 min-w-[42px] items-center justify-center
        rounded-sm
        bg-ink
        px-3
        text-[10px]
        font-bold
        text-white
        dark:bg-[#FAF7F2]
        dark:text-[#111145]
      "
                >
                  GO
                </span>
              </div>

              {/* Mole Concept Done */}
              <div
                className="
      flex h-[40px] items-center justify-between
      rounded-xl
      bg-tint-strong
      px-3
      dark:bg-[#242453]
    "
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-white dark:bg-surface dark:text-[#F0EDE5]">
                    <CheckIcon className="h-[10px] w-[10px]" />
                  </span>

                  <p className="truncate text-[14px] font-semibold text-ink">
                    Mole Concept Done
                  </p>
                </div>

                <p className="truncate text-[12px] text-ink">
                  Chemistry · Completed
                </p>
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="flex w-full max-w-[448px] flex-wrap items-center justify-center gap-[14px]">
            {HIGHLIGHTS.map((item) => (
              <OutlineChip key={item}>{item}</OutlineChip>
            ))}
          </div>

          {/* Google Button */}
          <div className="flex w-full flex-col gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = getGoogleAuthUrl();
              }}
            >
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="flex w-full items-center gap-3">
            <span className="h-px flex-1 bg-brand/10 dark:bg-white/10" />

            <span className="text-xs text-muted">
              or continue with
            </span>

            <span className="h-px flex-1 bg-brand/10 dark:bg-white/10" />
          </div>

          {/* Email */}
          <div className="flex w-full flex-col items-center gap-4">
            <Button href="/create-account" variant="primary">
              Continue with Email
            </Button>

            <p className="text-[14px] font-semibold text-muted sm:text-[16px]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-ink underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}