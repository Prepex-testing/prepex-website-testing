import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/stats/StatCard";
import { RankedList } from "@/components/stats/RankedList";

const SYLLABUS_SUBJECTS = [
  { label: "Physics", short: "P", percent: 62, fraction: "74/120" },
  { label: "Chemistry", short: "C", percent: 41, fraction: "49/120" },
  { label: "Maths", short: "M", percent: 58, fraction: "70/120" },
];

const PRECISION_GAPS = [
  {
    id: "coordinate-geometry",
    rank: 1,
    title: "Coordinate Geometry - Common Tangents",
    subtitle: "Maths · Weightage High",
    value: "38%",
  },
  {
    id: "lens-combinations",
    rank: 2,
    title: "Optics - Lens Combinations",
    subtitle: "Physics · Weightage High",
    value: "42%",
  },
  {
    id: "coordination-compounds",
    rank: 3,
    title: "Inorganic - Coordination Compds",
    subtitle: "Chemistry · Weightage High",
    value: "45%",
  },
  {
    id: "implicit-diff",
    rank: 4,
    title: "Calculus - Implicit Diff",
    subtitle: "Maths · Weightage Medium",
    value: "47%",
  },
  {
    id: "thermo-cycles",
    rank: 5,
    title: "Thermodynamics - Cycles",
    subtitle: "Physics · Weightage Medium",
    value: "51%",
  },
];

const WEIGHTAGE_TOPICS = [
  { label: "Coordinate Geometry", subject: "Maths", priority: "High", percent: 38 },
  { label: "Mechanics", subject: "Physics", priority: "High", percent: 42 },
  { label: "Organic Chemistry", subject: "Chemistry", priority: "High", percent: 45 },
  { label: "Thermodynamics", subject: "Physics", priority: "Medium", percent: 51 },
  { label: "Optics", subject: "Physics", priority: "Medium", percent: 42 },
];

const PRIORITY_DOTS: Record<string, string> = {
  High: "●●●",
  Medium: "●●○",
};

const MASTERY = [
  { label: "Learning", count: 12, color: "bg-brand" },
  { label: "Revision", count: 8, color: "bg-chart-2" },
  { label: "Mastered", count: 5, color: "bg-success" },
];

const MASTERY_TOTAL = MASTERY.reduce((sum, item) => sum + item.count, 0);

const STRONGEST_TOPICS = [
  { id: "modern-physics", rank: 1, title: "Modern Physics", value: "89%" },
  { id: "mole-concept", rank: 2, title: "Mole Concept", value: "88%" },
  { id: "matrices", rank: 3, title: "Matrices", value: "83%" },
  { id: "semiconductors", rank: 4, title: "Semiconductors", value: "81%" },
];

export default function ProgressStatsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-bold text-ink">Building Back to Pace</p>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-ink">53%</p>
              <p className="text-[9px] uppercase tracking-wide text-muted">
                Overall Syllabus Covered
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {SYLLABUS_SUBJECTS.map((subject) => (
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

        <StatCard title="Precision Gap Analysis" subtitle="Highest growth potential in these areas">
          <RankedList items={PRECISION_GAPS} />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard className="border-cta/20">
          <span className="inline-block rounded-full bg-cta px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
            Active Focus
          </span>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
            Mathematics
          </p>
          <p className="mt-1 text-base font-bold text-ink">
            Coordinate Geometry - Common Tangents
          </p>
          <p className="mt-1 text-xs text-muted">Highest Impact if you check this</p>

          <div className="mt-4 flex flex-wrap items-center gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">Accuracy</p>
              <p className="text-lg font-extrabold text-ink">38%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                JEE Weightage
              </p>
              <p className="text-lg font-extrabold text-ink">High</p>
            </div>
          </div>

          <Button variant="primary" size="sm" className="mt-4 w-full">
            Plan deep practice for this
          </Button>
        </StatCard>

        <StatCard
          title="JEE Weightage Breakdown"
          subtitle="High weightage topics where you lead most improvement"
        >
          <div className="flex flex-col gap-4">
            {WEIGHTAGE_TOPICS.map((topic) => (
              <div key={topic.label}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-body-text">
                    {topic.label}{" "}
                    <span className="text-muted">· {topic.subject}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">{topic.priority}</span>
                    <span className="text-cta">{PRIORITY_DOTS[topic.priority]}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-tint">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${topic.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs font-semibold text-cta">
            View full weightage breakdown →
          </p>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard title="Mastery Timeline">
          <div className="flex items-center gap-6">
            {MASTERY.map((item) => (
              <div key={item.label}>
                <p className="text-xl font-extrabold text-ink">{item.count}</p>
                <p className="text-[10px] text-muted">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-tint">
            {MASTERY.map((item) => (
              <div
                key={item.label}
                className={item.color}
                style={{ width: `${(item.count / MASTERY_TOTAL) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted">Current focus · Next 25 Topics</p>
        </StatCard>

        <StatCard
          title="Strongest Topics"
          right={<span className="shrink-0 text-xs font-semibold text-cta">View all →</span>}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {STRONGEST_TOPICS.map((topic) => (
              <div key={topic.id} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-bg text-[10px] font-bold text-success">
                  {topic.rank}
                </span>
                <span className="flex-1 truncate text-xs font-semibold text-ink">
                  {topic.title}
                </span>
                <span className="text-xs font-bold text-success">{topic.value}</span>
              </div>
            ))}
          </div>
        </StatCard>
      </div>
    </div>
  );
}
