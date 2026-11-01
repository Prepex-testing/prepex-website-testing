import Link from "next/link";
import type { Usage } from "@/lib/api/notebooks";
import { mb, storageNotice } from "@/lib/notebooks/model";

/** At 80% of either limit a gentle notice; at 100% a banner at the top (uploads stop, text and ink keep working). */
export function StorageBanner({ usage }: { usage: Usage | null | undefined }) {
  const n = storageNotice(usage);
  if (n.level === "none" || !usage) return null;
  const full = n.level === "full";
  return (
    <div role={full ? "alert" : "status"} data-testid={full ? "storage-full" : "storage-warn"} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold ${full ? "bg-danger-bg text-danger" : "bg-warning-bg text-ink"}`}>
      <span>
        {n.text} <span className="font-normal opacity-80">({mb(usage.bytes)} of {mb(usage.maxBytes)})</span>
      </span>
      <Link href="/notebooks" className="underline">
        Open your notebooks
      </Link>
    </div>
  );
}
