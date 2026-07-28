import { CheckIcon } from "@/components/ui/icons";

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
      className={`flex min-h-[63px] items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors sm:p-5 ${
        isDone
          ? "border-brand bg-tint-strong dark:border-chapter-box-border dark:bg-chapter-box-bg"
          : isPartial
            ? "border-cta/40 bg-surface dark:border-chapter-box-border dark:bg-chapter-box-bg"
            : "border-brand/10 bg-surface dark:border-chapter-box-border dark:bg-chapter-box-bg"
      }`}
    >
      <span className="flex items-center gap-3">
        {/* Radio / check — 24x24 */}
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            isDone
              ? "border-brand bg-brand text-white"
              : isPartial
                ? "border-cta bg-cta"
                : "border-brand/25"
          }`}
        >
          {isDone && <CheckIcon />}
        </span>
        {/* Label — Jakarta 500, 14px, lh 21 */}
        <span className="text-sm font-medium leading-[21px] text-body-text">
          {title}
        </span>
      </span>

      {isPartial && (
        <span className="shrink-0 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
          Partial
        </span>
      )}
    </button>
  );
}