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
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
        isDone
          ? "border-brand bg-tint-strong"
          : isPartial
            ? "border-cta/40 bg-surface"
            : "border-brand/10 bg-surface"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            isDone
              ? "border-brand bg-brand text-white"
              : isPartial
                ? "border-cta bg-cta"
                : "border-brand/25"
          }`}
        >
          {isDone && <CheckIcon />}
        </span>
        <span className="text-body-text">{title}</span>
      </span>

      {isPartial && (
        <span className="shrink-0 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
          Partial
        </span>
      )}
    </button>
  );
}
