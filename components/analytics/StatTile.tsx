import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  caption?: string;
  /** Tapping the tile opens this (a drill-down or the screen behind the number). */
  href?: string;
  testId: string;
  accent?: string;
};

const BASE = "flex min-h-24 flex-col justify-between gap-2 rounded-2xl border border-brand/10 bg-surface p-4 text-left";

/** One number on the dashboard. A tile with a link is a button to the numbers behind it. */
export function StatTile({ label, value, caption, href, testId, accent }: Props) {
  const body = (
    <>
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-[26px] font-extrabold leading-none text-ink" style={accent ? { color: accent } : undefined} data-testid={`${testId}-value`}>
        {value}
      </p>
      {caption && <p className="text-[12px] font-semibold text-muted">{caption}</p>}
    </>
  );
  if (!href) {
    return (
      <div className={BASE} data-testid={testId}>
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={`${BASE} transition-colors hover:bg-tint-strong`} data-testid={testId}>
      {body}
    </Link>
  );
}
