import { ChevronRightIcon } from "@/components/ui/icons";

export type PrecisionItem = {
    id: string;
    rank: number;
    title: string;
    subject: string;
    weightage: string;
    accuracy: string;
};

type Props = {
    items: PrecisionItem[];
};

export function PrecisionRankedList({ items }: Props) {
    return (
        <div className="flex flex-col">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-ink/5 sm:gap-4 sm:px-2"
                >
                    {/* Rank */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8">
                        <span className="text-base font-bold text-[#312E81] dark:text-[#FAF7F2]">
                            {item.rank}
                        </span>
                    </div>

                    {/* Middle */}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">
                            {item.title}
                        </p>

                        {/* Wraps on narrow phones instead of pushing past the row. */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="rounded-sm bg-[#EEF0F8] px-2 py-[2px] text-[9px] font-bold uppercase text-[#1A1A4E] dark:bg-blue-500/15 dark:text-[var(--text-primary,#FAF7F2)]">
                                {item.subject}
                            </span>

                            {/* <span className="text-[10px] text-[#9CA3AF] dark:text-[#A0A0B0]">
                                • Weightage: {item.weightage}
                            </span> */}
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-ink">
                                {item.accuracy}
                            </p>

                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A0A0B0]">
                                Accuracy
                            </p>
                        </div>

                        {/* <ChevronRightIcon className="h-4 w-4 text-ink" /> */}
                    </div>
                </div>
            ))}
        </div>
    );
}