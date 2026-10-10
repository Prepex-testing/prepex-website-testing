"use client";

/** Shown when the student's subjects and chapters could not be loaded (the pickers would otherwise be silently empty). */
export function SubjectsError() {
  return (
    <div role="alert" data-testid="subjects-error" className="flex flex-col gap-2 rounded-lg bg-danger-bg px-3 py-3 text-sm font-medium text-danger">
      <p>We couldn&apos;t load your subjects and chapters, so the pickers are empty. Check your connection and try again.</p>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 self-start rounded-lg border border-danger/40 px-4 text-[14px] font-bold">
        Reload
      </button>
    </div>
  );
}
