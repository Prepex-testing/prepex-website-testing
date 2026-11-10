import { StatCard } from "@/components/stats/StatCard";
import { COPY } from "@/lib/rankGps/labels";

/** The one short note written for this report (an AI call made once, in the background, with a plain-text fallback). */
export function CoachNote({ note }: { note: string }) {
  return (
    <StatCard title={COPY.coach}>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-body-text dark:text-ink" data-testid="rank-gps-coach">{note}</p>
    </StatCard>
  );
}
