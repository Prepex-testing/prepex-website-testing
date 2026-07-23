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
                    className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/5"
                >
                    {/* Rank */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                        <span className="text-base font-bold text-[#FAF7F2]">
                            {item.rank}
                        </span>
                    </div>

                    {/* Middle */}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#FAF7F2]">
                            {item.title}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-sm bg-blue-500/15 px-2 py-[2px] text-[9px] font-bold uppercase text-link">
                                {item.subject}
                            </span>

                            <span className="text-[10px] text-[#A0A0B0]">
                                • Weightage: {item.weightage}
                            </span>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-bold text-white">
                                {item.accuracy}
                            </p>

                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8B8998]">
                                Accuracy
                            </p>
                        </div>

                        <ChevronRightIcon className="h-4 w-4 text-[#8B8998]" />
                    </div>
                </div>
            ))}
        </div>
    );
}