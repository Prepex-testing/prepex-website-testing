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
    <div className="flex w-full max-w-[248px] flex-col gap-1.5">
      {label ? (
        <span className="text-xs font-semibold text-muted">{label}</span>
      ) : null}
      <div
        className={`
          flex
          h-[78px]
          w-full
          items-center
          justify-between
          rounded-[15px]
          border
          border-white/10
          bg-[#13133D]
          px-[22px]
        `}
      >
        {/* Minus */}
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="
            flex
            h-[34px]
            w-[34px]
            items-center
            justify-center
            rounded-lg
            border
            border-[#242453]
            text-white
            disabled:opacity-40
          "
        >
          <MinusIcon/>
        </button>

        {/* Number */}
        <span className="text-[26px] font-bold leading-none text-[#FAF7F2]">
          {value}
        </span>

        {/* Plus */}
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="
            flex
            h-[34px]
            w-[34px]
            items-center
            justify-center
            rounded-lg
            border
            border-[#242453]
            text-white
            disabled:opacity-40
          "
        >
          <PlusIcon  />
        </button>
      </div>
    </div>
  );
}