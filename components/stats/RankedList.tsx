import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

export type RankedItem = {
  id: string;
  rank: number;
  title: string;
  subtitle?: string;
  value?: string;
  valueClassName?: string;
  badge?: ReactNode;
};

type RankedListProps = {
  items: RankedItem[];
  rankClassName?: string;
};

export function RankedList({
  items,
  rankClassName = "bg-tint-strong text-ink",
}: RankedListProps) {
  return (
    <div className="flex flex-col divide-y divide-brand/5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${rankClassName}`}
          >
            {item.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
            {item.subtitle && (
              <p className="truncate text-[10px] text-muted">{item.subtitle}</p>
            )}
          </div>
          {item.badge}
          {item.value && (
            <span
              className={`shrink-0 text-xs font-bold ${item.valueClassName ?? "text-cta"}`}
            >
              {item.value}
            </span>
          )}
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
        </div>
      ))}
    </div>
  );
}
