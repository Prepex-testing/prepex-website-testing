"use client";

import { BLOCKABLE_APPS, formatAway, type BlockableAppId } from "@/lib/focus/appBlock";

type Props = {
  awayMs: number;
  blocked: BlockableAppId[];
  onBack: () => void;
};

/**
 * The web stand-in for app blocking: the student left the tab while the clock was running, so when they return the
 * timer says so, plainly and without scolding, and asks them to carry on.
 */
export function AwayNag({ awayMs, blocked, onBack }: Props) {
  const names = BLOCKABLE_APPS.filter((a) => blocked.includes(a.id)).map((a) => a.label);
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Welcome back" data-testid="away-nag" className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 px-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-6 text-center shadow-modal">
        <p className="text-[40px]" aria-hidden>
          👋
        </p>
        <h2 className="text-[20px] font-extrabold text-ink">Welcome back</h2>
        <p className="text-[14px] text-body-text dark:text-ink">
          You were away for {formatAway(awayMs)}. {names.length > 0 ? `${names.join(", ")} ${names.length === 1 ? "is" : "are"} on your block list for this session. ` : ""}
          Your clock kept running, so let&apos;s get back to it.
        </p>
        <button type="button" data-testid="away-back" onClick={onBack} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F]">
          Back to focus
        </button>
      </div>
    </div>
  );
}
