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

export function Select({
  label,
  required,
  placeholder,
  options,
  id,
  value,
  defaultValue,
  labelClassName = "text-[14px] font-semibold leading-[20px] text-ink",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const uncontrolledProps = value === undefined ? { defaultValue: defaultValue ?? "" } : { value };

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={selectId}
        className={labelClassName}
      >
        {label}
        {required && <span className="text-cta"> *</span>}
      </label>
      <div className="relative">
        <select
          id={selectId}
          {...uncontrolledProps}
          className="w-full appearance-none rounded-xl border border-brand/15 bg-surface px-4 py-3 pr-9 text-sm text-body-text outline-none focus:border-focus-ring"
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
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
