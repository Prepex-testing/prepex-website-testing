import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OutlineChip } from "@/components/ui/OutlineChip";
import { GoogleIcon, CheckIcon } from "@/components/ui/icons";

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
              <div className="flex h-[95px] flex-1 flex-col items-center justify-center rounded-2xl border border-brand/15 bg-surface dark:border-[#242453] dark:bg-[#1A1A4E]">
                <p className="text-[28px] font-extrabold leading-none text-ink sm:text-[32px]">
                  12
                </p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted">
                  Streak
                </p>
              </div>

              <div className="flex h-[95px] flex-1 flex-col items-center justify-center rounded-2xl border border-brand/15 bg-surface dark:border-[#242453] dark:bg-[#1A1A4E]">
                <p className="text-[28px] font-extrabold leading-none text-ink sm:text-[32px]">
                  4 / 6
                </p>

                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted">
                  Tasks
                </p>
              </div>
            </div>

            {/* Task List */}
            <div className="flex flex-col gap-2">
              {PREVIEW_TASKS.map((task) => (
                <div
                  key={task.title}
                  className={`flex min-h-[40px] items-center justify-between rounded-xl px-2 py-2 sm:h-10 sm:px-3 ${task.badge ? "bg-surface" : "bg-tint-strong"
                    }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full sm:h-4 sm:w-4 ${task.badge
                        ? "border border-ink text-ink"
                        : "bg-ink text-white dark:text-[#1A1A4E]"
                        }`}
                    >
                      <CheckIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold leading-tight text-ink xs:text-xs sm:text-[14px]">
                        {task.title}
                      </p>

                      {task.badge && (
                        <p className="truncate text-[10px] leading-tight text-muted xs:text-[11px] sm:text-xs">
                          {task.meta}
                        </p>
                      )}
                    </div>
                  </div>

                  {task.badge ? (
                    <span className="ml-2 shrink-0 rounded-sm bg-ink px-2 py-0.5 text-[9px] font-bold text-white dark:text-[#1A1A4E] sm:px-2.5 sm:py-1 sm:text-[11px]">
                      {task.badge}
                    </span>
                  ) : (
                    <span className="ml-2 shrink-0 text-[10px] text-muted sm:text-xs">
                      {task.meta}
                    </span>
                  )}
                </div>
              ))}
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
            <Button variant="secondary">
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