import { ClockIcon, StarIcon } from "@/components/ui/icons";
import { StatCard } from "@/components/stats/StatCard";
import { MeterRow } from "@/components/stats/MeterRow";
import { RankedList } from "@/components/stats/RankedList";
import { CircularProgress } from "@/components/ui/CircularProgress";

const SUBJECTS = [
  { label: "Physics", short: "P", percent: 72, fraction: "71/99" },
  { label: "Maths", short: "M", percent: 58, fraction: "57/98" },
  { label: "Chemistry", short: "C", percent: 41, fraction: "40/98" },
];

const MOCK_TREND = [150, 162, 158, 170, 175];
const MOCK_MAX = 300;

const MISTAKE_PATTERNS = [
  {
    id: "silly-errors",
    rank: 1,
    title: "Silly Errors",
    subtitle: "Careless calculation errors",
    value: "18",
  },
  {
    id: "conceptual",
    rank: 2,
    title: "Conceptual",
    subtitle: "Knowledge gaps",
    value: "24",
  },
  {
    id: "time-pressure",
    rank: 3,
    title: "Time Pressure",
    subtitle: "Incomplete attempts due to time",
    value: "12",
  },
  {
    id: "wild-guesses",
    rank: 4,
    title: "Wild Guesses",
    subtitle: "Random guessing patterns",
    value: "6",
  },
];

const WEAKEST_CHAPTERS = [
  { id: "current-electricity", rank: 1, title: "Current Electricity", value: "42%" },
  { id: "electrochemistry", rank: 2, title: "Electrochemistry", value: "45%" },
  { id: "ray-optics", rank: 3, title: "Ray Optics", value: "48%" },
  { id: "binomial-theorem", rank: 4, title: "Binomial Theorem", value: "50%" },
  { id: "rotation", rank: 5, title: "Rotation", value: "51%" },
];

const STRONGEST_CHAPTERS = [
  { id: "modern-physics", rank: 1, title: "Modern Physics", value: "89%" },
  { id: "mole-concept", rank: 2, title: "Mole Concept", value: "88%" },
  { id: "kinematics", rank: 3, title: "Kinematics", value: "84%" },
  { id: "semiconductors", rank: 4, title: "Semiconductors", value: "82%" },
  { id: "thermochemistry", rank: 5, title: "Thermochemistry", value: "81%" },
];

const DIFFICULTY_ACCURACY = [
  { label: "Easy", percent: 84 },
  { label: "Medium", percent: 68 },
  { label: "Hard", percent: 47 },
];

const TIME_PER_QUESTION = [
  { label: "Easy", time: "1.2 min" },
  { label: "Medium", time: "1.8 min" },
  { label: "Hard", time: "3.4 min" },
];

const ACCURACY_BY_TIME = [
  { label: "Morning", percent: 78 },
  { label: "Afternoon", percent: 69 },
  { label: "Evening", percent: 73 },
  { label: "Night", percent: 62 },
];

export default function AccuracyStatsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard title="Overall Accuracy">
          <div className="flex flex-col items-center gap-4">
            <CircularProgress percent={68} label="Accuracy" size={120} />
            <div className="flex w-full items-center justify-around">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Attempted
                </p>
                <p className="text-sm font-bold text-ink">142 Qns</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted">Correct</p>
                <p className="text-sm font-bold text-ink">96 Qns</p>
              </div>
            </div>
            <p className="flex items-center gap-1 text-xs text-muted">
              <ClockIcon />
              Average time: 1.8 min/question
            </p>
          </div>
        </StatCard>

        <StatCard
          title="Accuracy by Subject"
          right={
            <span className="shrink-0 text-xs font-semibold text-cta">Detailed view →</span>
          }
        >
          <div className="flex flex-col gap-4">
            {SUBJECTS.map((subject) => (
              <div key={subject.label}>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand text-[10px] font-bold text-white">
                    {subject.short}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-body-text">
                    {subject.label}
                  </span>
                  <span className="text-xs font-bold text-ink">{subject.percent}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-tint">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${subject.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted">{subject.fraction}</p>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard
          title="Mock Trend (JEE Main)"
          subtitle="Last 5 tests"
          right={
            <span className="shrink-0 text-xs font-semibold text-cta">Detailed view →</span>
          }
        >
          <svg viewBox="0 0 220 120" className="h-32 w-full" aria-hidden="true">
            <polyline
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={MOCK_TREND.map(
                (value, index) =>
                  `${(index / (MOCK_TREND.length - 1)) * 210 + 5},${
                    110 - (value / MOCK_MAX) * 100
                  }`,
              ).join(" ")}
            />
            <polygon
              fill="var(--brand)"
              opacity="0.08"
              points={`5,110 ${MOCK_TREND.map(
                (value, index) =>
                  `${(index / (MOCK_TREND.length - 1)) * 210 + 5},${
                    110 - (value / MOCK_MAX) * 100
                  }`,
              ).join(" ")} 215,110`}
            />
            <circle
              cx="215"
              cy={110 - (MOCK_TREND[MOCK_TREND.length - 1] / MOCK_MAX) * 100}
              r="4"
              fill="var(--cta)"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <p className="text-right text-xs font-bold text-ink">
            {MOCK_TREND[MOCK_TREND.length - 1]} marks
          </p>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard title="Mistake Patterns (Recoverable Marks)" right={<span className="shrink-0 text-xs font-semibold text-cta">Detailed view →</span>}>
          <RankedList
            items={MISTAKE_PATTERNS.map((item) => ({
              id: item.id,
              rank: item.rank,
              title: item.title,
              subtitle: item.subtitle,
              value: item.value,
            }))}
          />
        </StatCard>

        <StatCard title="Accuracy by Chapter" right={<span className="shrink-0 text-xs font-semibold text-cta">View all →</span>}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                Top 5 Weakest
              </p>
              <RankedList
                items={WEAKEST_CHAPTERS}
                rankClassName="bg-danger-bg text-danger"
              />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                Top 5 Strongest
              </p>
              <RankedList
                items={STRONGEST_CHAPTERS.map((item) => ({
                  ...item,
                  valueClassName: "text-success",
                }))}
                rankClassName="bg-success-bg text-success"
              />
            </div>
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Difficulty Accuracy">
          <div className="flex flex-col gap-4">
            {DIFFICULTY_ACCURACY.map((row) => (
              <MeterRow
                key={row.label}
                label={row.label}
                value={`${row.percent}%`}
                percent={row.percent}
              />
            ))}
          </div>
        </StatCard>

        <StatCard title="Time Per Question">
          <div className="flex flex-col gap-3">
            {TIME_PER_QUESTION.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-body-text">
                  <ClockIcon />
                  {row.label}
                </span>
                <span className="font-bold text-ink">{row.time}</span>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title="Accuracy by Time of Day">
          <div className="flex flex-col gap-3">
            {ACCURACY_BY_TIME.map((row) => (
              <MeterRow
                key={row.label}
                label={row.label}
                value={`${row.percent}%`}
                percent={row.percent}
              />
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted">
            Insight: Your accuracy dips 12% after 9pm.
          </p>
        </StatCard>

        <StatCard>
          <p className="text-center text-2xl font-extrabold text-ink">
            175 <span className="text-muted">± 8</span>
          </p>
          <p className="text-center text-xs font-semibold text-muted">Marks</p>
          <p className="mt-2 text-center text-[10px] text-muted">
            Based on your last 5 tests and current performance trend
          </p>
          <div className="mt-3 flex items-center justify-center gap-1 rounded-full bg-tint-strong px-3 py-1.5 text-[10px] font-bold text-ink">
            <StarIcon />
            70% Confidence
          </div>
        </StatCard>
      </div>
    </div>
  );
}
