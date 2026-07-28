import { MinusIcon, PlusIcon } from "@/components/ui/icons";

type StepperProps = {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function Stepper({
  label,
  value,
  min = 1,
  max = 100,
  disabled = false,
  onChange,
}: StepperProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      {label ? (
        <span className="text-[15px] font-bold leading-none text-body-text dark:text-ink sm:text-[16px]">
          {label}
        </span>
      ) : null}

      <div
        className="
    flex h-[84px] w-full items-center justify-center
    rounded-2xl bg-surface
    dark:bg-[#13133D]
  "
      >
        <div className="flex items-center gap-8">
          <button
            type="button"
            disabled={disabled || value <= min}
            onClick={() => onChange(Math.max(min, value - 1))}
            className="
        flex h-9 w-9 items-center justify-center rounded-lg
        border border-[#EEF0F8]
        text-body-text
        dark:border-[#242453] dark:text-ink
        disabled:opacity-40
      "
          >
            <MinusIcon />
          </button>

          <div className="w-[56px] text-center">
            <div className="text-[28px] font-bold leading-none text-ink">
              {value}
            </div>
            <div className="mt-1 text-[12px] leading-none text-ink">
              hours
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}
            className="
        flex h-9 w-9 items-center justify-center rounded-lg
        border border-[#EEF0F8]
        text-body-text
        dark:border-[#242453] dark:text-ink
        disabled:opacity-40
      "
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  );
}