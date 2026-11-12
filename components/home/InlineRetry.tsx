"use client";

/**
 * A1: shown inside a Home tile only after every automatic retry has failed. It sits inside tiles that are links, so
 * the button stops the tap from also opening the link.
 */
export function InlineRetry({
  what,
  onRetry,
}: {
  what: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-start gap-2"
      role="alert"
      data-testid="home-inline-error"
    >
      <p className="text-[13px] font-semibold text-ink">
        Couldn&apos;t load {what}.
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRetry();
        }}
        className="min-h-9 rounded-lg border border-border-subtle bg-surface px-3 text-[13px] font-bold text-ink transition hover:border-brand"
      >
        Retry
      </button>
    </div>
  );
}
