type ChapterState = "none" | "partial" | "done";

type ChapterItemProps = {
  title: string;
  state: ChapterState;
  onCycle: () => void;
};

export function ChapterItem({ title, state, onCycle }: ChapterItemProps) {
  const isPartial = state === "partial";
  const isDone = state === "done";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-pressed={state !== "none"}
      className={`flex h-18.5 items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors sm:h-20.5 sm:p-5 ${isDone
          ? "border-[#1A1A4E] bg-tint-strong dark:border-[#FAF7F2] dark:bg-chapter-box-bg"
          : isPartial
            ? "border-[#1A1A4E] bg-surface dark:border-[#FAF7F2] dark:bg-transparent"
            : "border-brand/10 bg-surface dark:border-chapter-box-border dark:bg-transparent"
        }`}
    >
      <span className="flex items-center gap-3">
        {/* Radio indicator — 24x24, ring + inner dot when done */}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-ink" : "border-brand/25"
            }`}
        >
          {isDone && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
        </span>
        {/* Label — Jakarta 500, 14px, lh 21, capped at 2 lines to match the fixed card height */}
        <span className="line-clamp-2 text-sm font-medium leading-[21px] text-body-text">
          {title}
        </span>
      </span>

      {isPartial && (
        // Badge — 6px radius, py4/px10, Bold 12/16
        <span className="shrink-0 rounded-sm bg-badge-partial-bg px-1.5 py-0.5 text-[9px] font-bold leading-3 text-subject-text">
          Partial
        </span>
      )}
    </button>
  );
}