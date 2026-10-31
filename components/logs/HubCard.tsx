"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/study/CountUp";

export type HubStat = { value: string; caption: string; count?: number; format?: (n: number) => string } | null;

/**
 * One tile on the Logs hub. The whole card is the link (the arrow is only a hint). `extras` is the richer desktop
 * content (from 1024px); below that the card is exactly the compact one it always was.
 */
export function HubCard({ href, title, blurb, stat, loading, testId, extras, index = 0 }: { href: string; title: string; blurb: string; stat: HubStat; loading: boolean; testId: string; extras?: ReactNode; index?: number }) {
  return (
    <Link
      href={href}
      data-testid={testId}
      style={{ animationDelay: `${index * 50}ms` }}
      className="study-fade-in group flex min-h-36 flex-col justify-between gap-3 rounded-2xl border border-brand/10 bg-surface p-5 transition-[background-color,transform] hover:bg-tint-strong active:scale-[0.995] motion-reduce:transition-none lg:min-h-64 lg:gap-5 lg:p-6"
    >
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
              {stat && stat.count !== undefined ? (
                <p className="text-[28px] font-extrabold leading-none text-ink lg:text-[44px]">
                  <CountUp value={stat.count} format={stat.format} testId={`${testId}-value`} />
                </p>
              ) : (
                <p className="text-[28px] font-extrabold leading-none text-ink lg:text-[44px]" data-testid={`${testId}-value`}>
                  {stat?.value ?? "—"}
                </p>
              )}
              <p className="mt-1 text-[13px] font-semibold text-muted">{stat?.caption ?? "Open to start"}</p>
            </>
          )}
        </div>
        <span aria-hidden className="text-[22px] font-bold text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
          →
        </span>
      </div>
      {!loading && extras && <div className="hidden border-t border-border-subtle pt-4 lg:block">{extras}</div>}
    </Link>
  );
}
