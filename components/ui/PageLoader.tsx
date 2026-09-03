import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

/**
 * Full-page loading state. Render this INSTEAD of the page body while the
 * page's API data is still loading, so static chrome (headers, filters,
 * empty cards) never flashes in before the real content is ready — the
 * whole page then paints at once.
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div
      className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-live="polite"
    >
      <LoadingIndicator />
      {label ? <p className="text-sm font-medium text-muted">{label}</p> : null}
    </div>
  );
}
