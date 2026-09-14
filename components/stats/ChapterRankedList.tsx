type ChapterItem = {
    id: string;
    rank: number;
    title: string;
    value: string;
    percent: number;
};

type Props = {
    title: string;
    titleColor: string;
    items: ChapterItem[];
    rankBg: string;
    valueColor: string;
};

export function ChapterRankedList({
    title,
    titleColor,
    items,
    rankBg,
    valueColor,
}: Props) {
    return (
        <div
            className="
        h-full
        rounded-xl
        border
        border-brand/10
        p-3
        shadow-[0_1px_2px_rgba(26,26,78,0.06)]
        dark:border-[#FAF7F2]/8
        dark:bg-[var(--bg-elevated,#1A1A4E)]
        dark:shadow-[0px_1px_2px_0px_#1A1A4E0F]
      "
        >
            {/* Heading */}
            <h3
                className="mb-3 text-xs font-bold uppercase tracking-[0.5px] sm:mb-4 sm:text-sm"
                style={{ color: titleColor }}
            >
                {title}
            </h3>

            {/* Rows */}
            <div className="flex flex-col gap-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-xl p-1.5 sm:p-2"
                    >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                            {/* Rank */}
                            <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold dark:border dark:border-[#FAF7F2]/8 sm:h-8 sm:w-8 ${rankBg}`}
                            >
                                {item.rank}
                            </div>

                            {/* Title + Progress */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold text-ink">
                                        {item.title}
                                    </p>

                                    <span
                                        className="shrink-0 text-sm font-bold"
                                        style={{ color: valueColor }}
                                    >
                                        {item.value}
                                    </span>
                                </div>

                                <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-ink/10">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${item.percent}%`,
                                            backgroundColor: valueColor,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}