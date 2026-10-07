import Link from "next/link";

type Props = {
  source?: "GOALS" | "SUGGESTED";
};

/**
 * Says where today's plan came from — the student's own weekly goals, or the
 * suggestion Prepex makes from chapter progress when no goals are set — with
 * the one-tap way to change that. Rendered above the plan on the home screen.
 */
export function PlanSourceBanner({ source }: Props) {
  if (!source) return null;
  const fromGoals = source === "GOALS";

  return (
    <div
      data-testid="plan-source-banner"
      data-source={source}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-t-2xl px-4 py-2.5 text-[12px] font-semibold ${
        fromGoals
          ? "bg-[var(--success-bg)] text-[var(--success)]"
          : "bg-[var(--warning-bg)] text-[var(--warning)] dark:text-[#f2b84d]"
      }`}
    >
      <span>{fromGoals ? "✓ Based on your weekly goals" : "Suggested plan — set weekly goals for yours"}</span>
      <Link href="/goals" className="ml-auto flex min-h-11 items-center underline underline-offset-2 sm:min-h-0">
        {fromGoals ? "View goals" : "Set goals"}
      </Link>
    </div>
  );
}
