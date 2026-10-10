"use client";

import Link from "next/link";

export type HubStat = { value: string; caption: string } | null;

export function HubCard({ href, title, blurb, stat, loading, testId }: { href: string; title: string; blurb: string; stat: HubStat; loading: boolean; testId: string }) {
  return (
    <Link href={href} data-testid={testId} className="flex min-h-36 flex-col justify-between gap-3 rounded-2xl border border-brand/10 bg-surface p-5 transition-colors hover:bg-tint-strong">
      <div>
        <h2 className="text-[20px] font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-[14px] text-muted">{blurb}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          {loading ? (
            <span className="block h-8 w-20 animate-pulse rounded-lg bg-tint-strong" aria-hidden />
          ) : (
            <>
              <p className="text-[28px] font-extrabold leading-none text-ink" data-testid={`${testId}-value`}>
                {stat?.value ?? "—"}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-muted">{stat?.caption ?? "Open to start"}</p>
            </>
          )}
        </div>
        <span aria-hidden className="text-[22px] font-bold text-muted">
          →
        </span>
      </div>
    </Link>
  );
}
