import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  label: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  labelClassName?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

const SELECT_TEXT_CLASS =
  "h-12.25 w-full appearance-none rounded-xl border border-input-border bg-surface px-4 py-3 pr-9 font-['Plus_Jakarta_Sans'] text-[16px] leading-[16px] tracking-normal outline-none transition-colors focus:border-input-border";

export function Select({
  label,
  required,
  placeholder,
  options,
  id,
  value,
  defaultValue,
  labelClassName = "text-body-lg font-medium leading-none text-body-text dark:text-ink",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const selectedValue = value ?? defaultValue ?? "";

  const uncontrolledProps =
    value === undefined
      ? { defaultValue: defaultValue ?? "" }
      : { value };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId} className={labelClassName}>
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>

      <div className="relative">
        <select
          id={selectId}
          {...uncontrolledProps}
          className={`${SELECT_TEXT_CLASS} ${selectedValue
              ? "font-medium text-[16px] text-ink"
              : "font-normal text-[14px] text-[#666666] dark:text-[#8B8998]"
            }`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-6 w-3 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}