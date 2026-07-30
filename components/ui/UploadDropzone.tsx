import { useId } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { PlusIcon, XIcon } from "@/components/ui/icons";

type UploadDropzoneProps = {
  onFileSelect?: (file: File | null) => void;
  previewUrl?: string | null;
  fileName?: string | null;
};

export function UploadDropzone({ onFileSelect, previewUrl, fileName }: UploadDropzoneProps) {
  const inputId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileSelect?.(event.target.files?.[0] ?? null);
    // Allow re-selecting the same file after removing it.
    event.target.value = "";
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onFileSelect?.(null);
  };

  const fileInput = (
    <input
      id={inputId}
      type="file"
      accept="image/jpeg,image/png,image/heic"
      onChange={handleChange}
      className="sr-only"
    />
  );

  if (previewUrl) {
    return (
      // Box — same footprint as the empty dropzone, swapped for a single-image preview.
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#D1D5DB] dark:border-[#D1D5DB] bg-surface p-4 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a static/remote asset */}
        <img
          src={previewUrl}
          alt={fileName ?? "Uploaded schedule preview"}
          className="max-h-48 w-full rounded-lg object-contain"
        />

        <div className="flex w-full items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs text-muted">{fileName}</span>

          <div className="flex shrink-0 items-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer whitespace-nowrap text-xs font-semibold text-ink underline"
            >
              Replace
            </label>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove uploaded image"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D9DADB] text-muted"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {fileInput}
      </div>
    );
  }

  return (
    // Box — 631x197.9, radius 12px, dashed border, padding 64px (scaled down on mobile)
    <label
      htmlFor={inputId}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#D1D5DB] dark:border-[#D1D5DB] bg-surface px-6 py-10 text-center sm:px-16 sm:py-14"
    >
      <span className="flex h-8 w-9 items-center justify-center text-body-text dark:text-ink">
        <PlusIcon />
      </span>
      <span className="text-[14px] font-semibold leading-[100%] text-ink sm:text-[16px]">
        Drop your screenshot or browse
      </span>
      <span className="text-xs text-muted">JPG, PNG, HEIC, up to 10MB</span>
      {fileInput}
    </label>
  );
}