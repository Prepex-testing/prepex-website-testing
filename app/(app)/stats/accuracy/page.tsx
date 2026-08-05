import {
  AlertCircleIcon,
  BoltIcons,
  ClockIcon,
  ClockIconss,
  CloudMoonIcon,
  CloudSunIcon,
  DiceIcon,
  LightbulbIcon,
  MoonIcon,
  StarIcon,
  SunIcon,
} from "@/components/ui/icons";
import { StatCard } from "@/components/stats/StatCard";
import { MeterRow } from "@/components/stats/MeterRow";
import { RankedList } from "@/components/stats/RankedList";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ChapterRankedList } from "@/components/stats/ChapterRankedList";
import { LeftIconcon } from "@/assets/icons";

const SUBJECTS = [
  {
    label: "Physics",
    short: "P",
    percent: 72,
    fraction: "71/99",
    barClassName: "bg-[#1A1A4E] dark:bg-[rgba(250,247,242,0.25)]",
  },
  {
    label: "Maths",
    short: "M",
    percent: 58,
    fraction: "57/98",
    barClassName: "bg-[#1A1A4E] dark:bg-[#4C1D95]",
  },
  {
    label: "Chemistry",
    short: "C",
    percent: 41,
    fraction: "40/98",
    barClassName: "bg-[#1A1A4E] dark:bg-[#8B8998]",
  },
];

const MOCK_TREND = [174, 180, 183, 209, 245];
const MOCK_MAX = 300;

const MISTAKE_PATTERNS = [
  {
    id: "silly",
    title: "Silly Errors",
    subtitle: "Careless calculation & reading",
    value: "18",
    icon: <AlertCircleIcon className="h-5 w-5" />,
    titleClassName: "text-[#1D1D4B] dark:text-ink",
    subtitleClassName: "text-[#9CA3AF]",
    valueClassName: "text-[#F59E0B]",
  },
  {
    id: "conceptual",
    title: "Conceptual",
    subtitle: "Knowledge gaps in basics",
    value: "24",
    icon: <LightbulbIcon className="h-5 w-5" />,
    titleClassName: "text-[#1D1D4B] dark:text-ink",
    subtitleClassName: "text-[#9CA3AF]",
    valueClassName: "text-[#F59E0B]",
  },
  {
    id: "time",
    title: "Time Pressure",
    subtitle: "Incomplete attempts at end",
    value: "12",
    icon: <ClockIconss className="h-5 w-5" />,
    titleClassName: "text-[#1D1D4B] dark:text-ink",
    subtitleClassName: "text-[#9CA3AF]",
    valueClassName: "text-[#F59E0B]",
  },
  {
    id: "guess",
    title: "Wild Guesses",
    subtitle: "Incorrect logical deductions",
    value: "8",
    icon: <DiceIcon className="h-5 w-5" />,
    titleClassName: "text-[#1D1D4B] dark:text-ink",
    subtitleClassName: "text-[#9CA3AF]",
    valueClassName: "text-[#F59E0B]",
  },
];

const WEAKEST_CHAPTERS = [
  {
    id: "1",
    rank: 1,
    title: "Current Electricity",
    value: "42%",
    percent: 42,
  },
  {
    id: "2",
    rank: 2,
    title: "Electrochemistry",
    value: "45%",
    percent: 45,
  },
  {
    id: "3",
    rank: 3,
    title: "Ray Optics",
    value: "48%",
    percent: 48,
  },
  {
    id: "4",
    rank: 4,
    title: "Binomial Theorem",
    value: "50%",
    percent: 50,
  },
  {
    id: "5",
    rank: 5,
    title: "Rotation",
    value: "51%",
    percent: 51,
  },
];

const STRONGEST_CHAPTERS = [
  {
    id: "1",
    rank: 1,
    title: "Modern Physics",
    value: "89%",
    percent: 89,
  },
  {
    id: "2",
    rank: 2,
    title: "Mole Concept",
    value: "84%",
    percent: 84,
  },
  {
    id: "3",
    rank: 3,
    title: "Kinematics",
    value: "84%",
    percent: 84,
  },
  {
    id: "4",
    rank: 4,
    title: "Semiconductors",
    value: "82%",
    percent: 82,
  },
  {
    id: "5",
    rank: 5,
    title: "Thermochemistry",
    value: "81%",
    percent: 81,
  },
];

const DIFFICULTY_ACCURACY = [
  { label: "Easy", percent: 84, barClassName: "bg-brand dark:bg-ink" },
  { label: "Medium", percent: 68, barClassName: "bg-brand dark:bg-[#4C1D95]" },
  { label: "Hard", percent: 47, barClassName: "bg-brand dark:bg-ink" },
];

const TIME_PER_QUESTION = [
  { label: "Easy", time: "1.2 min" },
  { label: "Medium", time: "1.8 min" },
  { label: "Hard", time: "3.4 min" },
];

const ACCURACY_BY_TIME = [
  {
    label: "Morning",
    percent: 78,
    icon: <SunIcon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" />,
  },
  {
    label: "Afternoon",
    percent: 69,
    icon: <CloudSunIcon />,
  },
  {
    label: "Evening",
    percent: 73,
    icon: <CloudMoonIcon/>,
  },
  {
    label: "Night",
    percent: 62,
    icon: <MoonIcon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" />,
  },
];

export default function AccuracyStatsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Overall Accuracy">
          <div className="flex flex-col items-center gap-4">
            <CircularProgress
              percent={68}
              label="Accuracy"
              size={120}
              progressGradient={{ from: "var(--score-ring-from)", to: "var(--score-ring-to)" }}
              labelClassName="text-[#777681] dark:text-muted"
            />
            <div className="w-full border-t border-brand/10 pt-4">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-[#777681] dark:text-muted">
                    Attempted
                  </p>
                  <p className="text-sm font-bold text-ink">142 Qns</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wide text-[#777681] dark:text-muted">Correct</p>
                  <p className="text-sm font-bold text-ink">96 Qns</p>
                </div>
              </div>
            </div>
            <p className="flex items-center gap-1 text-xs text-[#777681] dark:text-muted">
              <ClockIcon />
              Average time: 1.8 min/question
            </p>
          </div>
        </StatCard>

        <StatCard
          title="Accuracy by Subject"
          right={
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
              Detailed view
              <LeftIconcon className="h-2.5 w-2.5" />
            </span>
          }
        >
          <div className="flex flex-col gap-5">
            {SUBJECTS.map((subject) => (
              <div key={subject.label} className="flex items-center gap-3">
                {/* Subject Initial */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-sm font-bold text-ink">
                  {subject.short}
                </div>

                {/* Subject Name + Progress */}
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#374151] dark:text-ink">
                      {subject.label}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#111827] dark:text-ink">
                        {subject.percent}%
                      </span>
                      <span className="text-xs text-[#9CA3AF] dark:text-muted">
                        {subject.fraction}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
                    <div
                      className={`h-full rounded-full ${subject.barClassName}`}
                      style={{ width: `${subject.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard
          title="Mock Trend (JEE Main)"
          subtitle="Last 5 mocks performance analysis"
          subtitleClassName="text-[#9CA3AF] dark:text-muted"
          right={
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
              Detailed view
              <LeftIconcon className="h-2.5 w-2.5" />
            </span>
          }
        >
          {(() => {
            const chartWidth = 250;
            const chartHeight = 160;

            const left = 34;
            const bottom = 125;
            const top = 25;
            const right = 18;

            const usableWidth = chartWidth - left - right;
            const usableHeight = bottom - top;

            const points = MOCK_TREND.map((value, index) => {
              const x =
                left +
                (index / (MOCK_TREND.length - 1)) * usableWidth;

              const y =
                bottom -
                (value / MOCK_MAX) * usableHeight;

              return { x, y, value };
            });

            const line = points.reduce((path, point, i) => {
              if (i === 0) {
                return `M ${point.x} ${point.y}`;
              }

              const prev = points[i - 1];
              const cx = (prev.x + point.x) / 2;

              return `${path}
        C ${cx} ${prev.y},
          ${cx} ${point.y},
          ${point.x} ${point.y}`;
            }, "");

            return (
              <>
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h- w-full"
                >
                  <defs>
                    <linearGradient
                      id="mockTrendFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#5A47FF"
                        stopOpacity="0.30"
                      />
                      <stop
                        offset="100%"
                        stopColor="#5A47FF"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {[300, 225, 150, 75, 0].map((tick) => {
                    const y =
                      bottom -
                      (tick / MOCK_MAX) * usableHeight;

                    return (
                      <text
                        key={tick}
                        x="2"
                        y={y + 4}
                        fontSize="9"
                        className="fill-[#9CA3AF] dark:fill-muted"
                      >
                        {tick}
                      </text>
                    );
                  })}

                  <path
                    d={`${line} L ${points.at(-1)!.x} ${bottom}
                L ${points[0].x} ${bottom} Z`}
                    fill="url(#mockTrendFill)"
                  />

                  <path
                    d={line}
                    fill="none"
                    stroke="#5B4BFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {points.map((point, index) => (
                    <g key={index}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                        fill="var(--ink)"
                        stroke="var(--surface)"
                        strokeWidth="1.8"
                      />

                      <text
                        x={point.x}
                        y={point.y - 10}
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--ink)"
                        fontWeight="700"
                      >
                        {point.value}
                      </text>
                    </g>
                  ))}
                </svg>


              </>
            );
          })()}
        </StatCard>
      </div>

      {/* w-full + max-w caps at 1090 and centers.
    Two columns from lg up. gap-6 is the ONLY space between the boxes. */}
      <div className="mx-auto grid w-full  grid-cols-1 items-stretch gap-6 lg:grid-cols-[506fr_560fr]">
        {/* Left — 506fr */}
        <StatCard
          className="flex h-full w-full min-w-0 flex-col p-6"
          title="Mistake Patterns (Recoverable Marks)"
          right={
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
              Detailed view
              <LeftIconcon className="h-2.5 w-2.5" />
            </span>
          }
        >
          <RankedList items={MISTAKE_PATTERNS} />
        </StatCard>

        {/* Right — 560fr */}
        <StatCard
          className="flex h-full w-full min-w-0 flex-col p-6"
          title="Accuracy by Chapter"
          right={
            <span className="flex items-center gap-1 text-xs font-semibold text-ink">
              View all
              <LeftIconcon className="h-2.5 w-2.5" />
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChapterRankedList
              title="TOP 5 WEAKEST"
              titleColor="#F59E0B"
              rankBg="bg-[#F59E0B]/15 text-[#F59E0B]"
              valueColor="var(--ink)"
              items={WEAKEST_CHAPTERS}
            />

            <ChapterRankedList
              title="TOP 5 STRONGEST"
              titleColor="#1E8449"
              rankBg="bg-[#1E8449]/15 text-[#1E8449]"
              valueColor="var(--ink)"
              items={STRONGEST_CHAPTERS}
            />
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[176fr_111fr_111fr_111fr]">
        <StatCard title="Difficulty Accuracy" padding="p-5">
          <div className="flex flex-col gap-5">
            {DIFFICULTY_ACCURACY.map((row) => (
              <MeterRow
                key={row.label}
                label={row.label}
                value={`${row.percent}%`}
                percent={row.percent}
                barClassName={row.barClassName}
                trackClassName="bg-muted/25"
                trackHeightClassName="h-1.5"
                labelClassName="text-[#6B7280]"
              />
            ))}
          </div>
        </StatCard>

        <StatCard title="Time Per Question" padding="p-5">
          <div className="flex flex-col gap-4">
            {TIME_PER_QUESTION.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-[#4B5563] dark:text-muted">
                  <ClockIcon />
                  {row.label}
                </span>
                <span className="whitespace-nowrap font-bold text-ink">{row.time}</span>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title="Accuracy by Time of Day" padding="p-5">
          <div className="flex items-start justify-between gap-2">
            {ACCURACY_BY_TIME.map((row) => (
              <div key={row.label} className="flex flex-col items-center gap-0.75">
                <span className="text-muted">{row.icon}</span>
                <span className="text-center text-[8px] font-bold leading-3 text-muted">
                  {row.label}
                </span>
                <span className="text-xs font-bold text-ink">{row.percent}%</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-tint px-2 py-2">
            <LightbulbIcon className="mt-0.5 h-3 w-3 shrink-0 text-cta" />
            <p className="text-[9px] font-medium leading-[13.5px] text-body-text">
              Insight: You&apos;re 12% more accurate before noon.
            </p>
          </div>
        </StatCard>

        <StatCard title="Predicted Next Mock" padding="p-6">
          <div className="flex flex-col items-center">
            <p className="text-center text-[32px] font-extrabold leading-none text-ink">
              175 <span className="">± 8</span>
            </p>
            <p className="mt-2 text-center text-sm font-bold text-ink">Marks</p>
            <div className="mt-3 flex items-center justify-center gap-1 rounded-full bg-tint-strong px-3 py-1.5 text-[10px] font-bold text-ink">
              90% Confidence
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/10 bg-tint px-3 py-3">
            <BoltIcons className="mt-0.5 h-4.5 w-4 shrink-0 text-cta" />
            <p className="text-[9px] leading-[11.25px] text-body-text">
              Based on your last 5 mocks and current performance trend.
            </p>
          </div>
        </StatCard>
      </div>
    </div>
  );
}
