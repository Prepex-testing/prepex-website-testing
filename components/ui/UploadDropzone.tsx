import { useId } from "react";
import { PlusIcon } from "@/components/ui/icons";

export function UploadDropzone() {
  const inputId = useId();

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/20 bg-surface px-4 py-8 text-center"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
        <PlusIcon />
      </span>
      <span className="text-sm font-semibold text-ink">
        Drop your screenshot or browse
      </span>
      <span className="text-xs text-muted">
        JPG, PNG, HEIC, up to 10MB
      </span>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/heic"
        className="sr-only"
      />
    </label>
  );
}
