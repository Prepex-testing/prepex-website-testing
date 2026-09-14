import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

export type RankedItem = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  icon: ReactNode;
};

type RankedListProps = {
  items: RankedItem[];
};

export function RankedList({ items }: RankedListProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          // A minimum rather than a fixed 76px, so a subtitle that wraps on a
          // narrow card grows the row instead of spilling out of it.
          className="
            flex
            min-h-[68px]
            items-center
            justify-between
            gap-2
            rounded-xl
            border
            border-brand/10
            bg-transparent
            px-3
            py-3
            sm:min-h-[76px]
            sm:gap-3
          "
        >
          {/* Left */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-[10px]
                bg-tint
                text-ink
                sm:h-12
                sm:w-12
              "
            >
              {item.icon}
            </div>

            <div className="min-w-0">
              <h4 className={`text-sm font-bold ${item.titleClassName ?? "text-ink"}`}>
                {item.title}
              </h4>

              {item.subtitle && (
                <p
                  className={`mt-0.5 text-[10px] leading-[15px] ${
                    item.subtitleClassName ?? "text-muted"
                  }`}
                >
                  {item.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="text-right">
              <p
                className={`text-base font-bold ${
                  item.valueClassName ?? "text-warning"
                }`}
              >
                {item.value}
              </p>

              <p className="whitespace-nowrap text-[10px] text-muted">
                Marks recoverable
              </p>
            </div>

            <ChevronRightIcon className="h-4 w-4 text-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
