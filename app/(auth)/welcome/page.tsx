import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GoogleIcon, CheckIcon } from "@/components/ui/icons";

const PREVIEW_TASKS = [
  {
    title: "Kinematics Practice",
    meta: "Physics · 45 mins",
    badge: "GO",
  },
  {
    title: "Mole Concept Done",
    meta: "Chemistry - Completed",
  },
];

const HIGHLIGHTS = ["AI Daily Plans", "Burnout Detection", "Smart Revision"];

export default function WelcomePage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-3xl bg-surface p-5 shadow-modal sm:p-10">
        <div className="flex flex-col items-center gap-8">
          <Logo size="compact" />

          <div className="grid w-full grid-cols-2 gap-4">
            <div className="rounded-md border border-brand/15 py-5 text-center">
              <p className="text-3xl font-extrabold text-ink">12</p>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Streak
              </p>
            </div>
            <div className="rounded-md border border-brand/15 py-5 text-center">
              <p className="text-3xl font-extrabold text-ink">4 / 6</p>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Tasks
              </p>
            </div>
          </div>

          <div className="w-full space-y-2 rounded-md bg-tint-strong p-3">
            {PREVIEW_TASKS.map((task) => (
              <div
                key={task.title}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                    <CheckIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {task.title}
                    </p>
                    {task.badge && (
                      <p className="text-xs text-muted">{task.meta}</p>
                    )}
                  </div>
                </div>
                {task.badge ? (
                  <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                    {task.badge}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted">{task.meta}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {HIGHLIGHTS.map((label) => (
              <Chip key={label}>{label}</Chip>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3">
            <Button variant="secondary">
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          <div className="flex w-full items-center gap-4 text-xs text-muted">
            <span className="h-px flex-1 bg-brand/10" />
            or continue with
            <span className="h-px flex-1 bg-brand/10" />
          </div>

          <Button href="/create-account" variant="primary">
            Continue with Email
          </Button>

          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
