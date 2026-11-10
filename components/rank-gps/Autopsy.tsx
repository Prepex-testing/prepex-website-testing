import Link from "next/link";
import { StatCard } from "@/components/stats/StatCard";
import { ProLocked } from "@/components/rank-gps/ProLocked";
import { fmtMarks, fmtPercentile } from "@/lib/rankGps/format";
import { COPY, REASON_LABELS } from "@/lib/rankGps/labels";
import type { Autopsy as AutopsyData, MockAutopsy } from "@/lib/rankGps/types";

/** One mock as a waterfall: the full paper, then each reason's marks stepping down to the score. */
function Waterfall({ a }: { a: MockAutopsy }) {
  const steps: { label: string; from: number; to: number; tone: "full" | "loss" | "score" | "other" }[] = [{ label: "Full paper", from: 0, to: a.max, tone: "full" }];
  let top = a.max;
  for (const r of a.reasons) {
    steps.push({ label: `${REASON_LABELS[r.reason]} (${r.count})`, from: top - r.marks, to: top, tone: "loss" });
    top -= r.marks;
  }
  const unexplained = Math.max(0, top - a.total);
  if (unexplained > 0.5) {
    steps.push({ label: "Not attempted or untagged", from: top - unexplained, to: top, tone: "other" });
  }
  steps.push({ label: "Your score", from: 0, to: a.total, tone: "score" });
  const tone = { full: "bg-tint-strong", loss: "bg-danger/70", other: "bg-muted/40", score: "bg-brand" } as const;
  return (
    <ul className="flex flex-col gap-2" data-testid="autopsy-waterfall">
      {steps.map((s, i) => (
        <li key={`${s.label}-${i}`} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_3.2rem] items-center gap-2 text-[12px] sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem]">
          <span className="truncate text-body-text dark:text-ink">{s.label}</span>
          <span className="relative h-4 rounded-full bg-tint-strong/50">
            <span className={`absolute top-0 h-4 rounded-full ${tone[s.tone]}`} style={{ left: `${(s.from / a.max) * 100}%`, width: `${Math.max(1, ((s.to - s.from) / a.max) * 100)}%` }} />
          </span>
          <span className="text-right font-bold text-ink">{s.tone === "loss" || s.tone === "other" ? "−" : ""}{fmtMarks(s.to - s.from)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Autopsy({ autopsy, locked, hasMocks }: { autopsy: AutopsyData; locked: boolean; hasMocks: boolean }) {
  const a = autopsy.latest;
  return (
    <StatCard title={COPY.autopsy} subtitle={a ? `${a.name.toUpperCase()} · ${a.date}` : "YOUR LATEST FULL MOCK"}>
      {!a ? (
        <div className="flex flex-col items-start gap-2" data-testid="autopsy-empty">
          <p className="text-[14px] text-muted">{autopsy.missing && hasMocks ? COPY.needsAutopsy : "Log a full mock and tag its mistakes to see where the marks went."}</p>
          <Link href={autopsy.missing && hasMocks ? "/notebooks/capture" : "/logs/mocks"} className="inline-flex min-h-11 items-center text-[14px] font-bold text-brand underline dark:text-ink">
            {autopsy.missing && hasMocks ? "Tag the mistakes" : "Log a mock"}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="rank-gps-autopsy">
          <p className="text-[14px] text-body-text dark:text-ink">
            You scored <b>{fmtMarks(a.total)}</b> of {a.max} and left <b>{fmtMarks(a.lost)}</b> on the table: {a.attemptedWrong} wrong (5 each) and {a.blank} blank (4 each).
          </p>
          <Waterfall a={a} />
          {a.fixBiggest && (
            <div className="rounded-xl bg-tint-strong p-3 text-[13px] text-ink" data-testid="autopsy-impact">
              Fix your biggest leak, <b>{REASON_LABELS[a.fixBiggest.reason].toLowerCase()}</b> ({fmtMarks(a.fixBiggest.marks)} marks), and the same paper moves from the{" "}
              {fmtPercentile(a.fixBiggest.percentileNow)} percentile to about {fmtPercentile(a.fixBiggest.percentileLow)} to {fmtPercentile(a.fixBiggest.percentileHigh)}.
            </div>
          )}
          {autopsy.all.length > 1 && (
            <div data-testid="autopsy-trend">
              <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-muted">Earlier mocks</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                {autopsy.all.slice(1).map((m) => (
                  <li key={m.mockId} className="flex justify-between gap-3">
                    <span className="truncate text-body-text dark:text-ink">{m.name} · {m.date}</span>
                    <span className="shrink-0 text-muted">{fmtMarks(m.total)} / {m.max} · {fmtMarks(m.lost)} lost</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {locked && <ProLocked section="autopsyTrend" hint="You see your latest mock." />}
        </div>
      )}
    </StatCard>
  );
}
