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
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="
            flex
            h-[76px]
            items-center
            justify-between
            rounded-xl
            border
            border-brand/10
            bg-transparent
            px-3
            py-3
          "
        >
          {/* Left */}
          <div className="flex items-center gap-4">
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-[10px]
                bg-tint
                text-ink
              "
            >
              {item.icon}
            </div>

            <div>
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p
                className={`text-base font-bold ${
                  item.valueClassName ?? "text-warning"
                }`}
              >
                {item.value}
              </p>

              <p className="text-[10px] text-muted">
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