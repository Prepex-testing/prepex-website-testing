import { CheckIcon } from "@/components/ui/icons";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-brand/25 text-white peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring">
        {checked && <CheckIcon />}
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </label>
  );
}
