import { CheckIcon } from "@/components/ui/icons";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

export function Checkbox({
  label,
  checked,
  onChange,
}: CheckboxProps) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />

      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand/25 text-white peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring"
      >
        {checked && (
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <CheckIcon />
          </span>
        )}
      </span>

      <span
        className="text-[15px] font-bold leading-none text-body-text dark:text-muted sm:text-[16px]"
      >
        {label}
      </span>
    </label>
  );
}