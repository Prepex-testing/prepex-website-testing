import { useId } from "react";
import type { ChangeEvent } from "react";
import { PlusIcon } from "@/components/ui/icons";

type UploadDropzoneProps = {
  onFileSelect?: (file: File | null) => void;
};

export function UploadDropzone({ onFileSelect }: UploadDropzoneProps) {
  const inputId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelect?.(event.target.files?.[0] ?? null);
  };

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
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}
