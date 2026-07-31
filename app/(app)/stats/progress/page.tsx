import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/stats/StatCard";
import { RankedList } from "@/components/stats/RankedList";
import { ChevronRightIcon } from "@/components/ui/icons";
import { PrecisionRankedList } from "@/components/stats/PrecisionRankedList";

const SYLLABUS_SUBJECTS = [
  { label: "Physics", short: "P", percent: 62, fraction: "74/120" },
  { label: "Chemistry", short: "C", percent: 41, fraction: "49/120" },
  { label: "Maths", short: "M", percent: 58, fraction: "70/120" },
];

const PRECISION_GAPS = [
  {
    id: "1",
    rank: 1,
    title: "Coordinate Geometry – Common Tangents",
    subject: "MATHS",
    weightage: "High",
    accuracy: "38%",
  },
  {
    id: "2",
    rank: 2,
    title: "Optics – Lens Combinations",
    subject: "PHYSICS",
    weightage: "Medium",
    accuracy: "42%",
  },
  {
    id: "3",
    rank: 3,
    title: "Inorganic – Coordination Compounds",
    subject: "CHEMISTRY",
    weightage: "High",
    accuracy: "45%",
  },
  {
    id: "4",
    rank: 4,
    title: "Calculus – Implicit Diff",
    subject: "MATHEMATICS",
    weightage: "Medium",
    accuracy: "47%",

  },
  {
    id: "5",
    rank: 5,
    title: "Thermodynamics – Cycles",
    subject: "PHYSICS",
    weightage: "High",
    accuracy: "51%",
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

      {/* fr units (not %) so gap-6 doesn't overflow. min-w-0 lets cards shrink to their track. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[38fr_62fr]">
        {/* Left */}
        <StatCard className="flex h-full w-full min-w-0 flex-col p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold leading-none text-ink">
              Building Back to Pace
            </h2>
          </div>

          {/* Coverage Header */}
          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-ink">
              Syllabus Coverage
            </h3>

            <div className="flex flex-col items-end gap-1">
              {/* Circular Progress */}
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.5
        a15.5 15.5 0 1 1 0 31
        a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="var(--tint-strong)"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M18 2.5
        a15.5 15.5 0 1 1 0 31
        a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2.5"
                    strokeDasharray="53 100"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-ink">53%</span>
                </div>
              </div>

              <p className="text-right text-[10px] font-bold uppercase tracking-[0.5px] text-muted">
                Overall Syllabus Covered
              </p>
            </div>
          </div>

          {/* Subjects */}
          <div className="mt-8 flex flex-col gap-6">
            {SYLLABUS_SUBJECTS.map((subject) => (
              <div key={subject.label} className="flex gap-3">
                {/* Badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint-strong">
                  <span className="text-base font-bold text-ink">
                    {subject.short}
                  </span>
                </div>

                {/* Right */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-ink">
                      {subject.label}
                    </span>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold text-ink">
                        {subject.percent}%
                      </span>
                      <span className="text-[11px] text-muted">
                        {subject.fraction}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full ${subject.short === "C" ? "bg-[#5B21B6]" : "bg-ink"
                        }`}
                      style={{ width: `${subject.percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[10px] text-muted">
                    {subject.fraction} mins retained
                  </p>
                </div>
              </div>
            ))}
          </div>
        </StatCard>

        {/* Right */}
        <StatCard
          className="flex h-full w-full min-w-0 flex-col p-6"
          title="Precision Gap Analysis"
          subtitle="Highest growth potential in these areas"
        >
          <PrecisionRankedList items={PRECISION_GAPS} />

          <button className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-bold text-ink">
            View weak topics
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[329px_1fr]">

        {/* ================= LEFT CARD ================= */}
        <StatCard
          className="
    h-[404px]
    rounded-2xl
    border border-brand/10
    bg-surface
    p-6
    shadow-[0px_2px_8px_0px_rgba(26,26,78,0.08)]
  "
        >
          {/* Active Focus Badge */}
          <div className="h-5 w-full">
            <span
              className="
        inline-flex
        h-5
        w-[100px]
        items-center
        justify-center
        rounded
        bg-cta
        px-3
        text-[10px]
        font-bold
        uppercase
        leading-[15px]
        tracking-normal
        text-white
        dark:bg-white
        dark:text-[#111145]
      "
            >
              Active Focus
            </span>
          </div>

          {/* Title Section */}
          <div className="mt-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted">
              Mathematics
            </p>

            <h2 className="text-[20px] font-bold leading-[27.5px] text-ink">
              Coordinate Geometry –
              <br />
              Common Tangents
            </h2>

            <p className="text-xs leading-4 text-muted">
              Highest impact if you crack this.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted">
                Accuracy
              </p>

              <p className="mt-1 text-[30px] font-extrabold leading-9 text-ink">
                38%
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-muted">
                JEE Weightage
              </p>

              <p className="mt-1 text-[30px] font-extrabold leading-9 text-ink">
                High
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            variant="task"
            className="mt-10 rounded-xl px-4 py-4 text-base"
          >
            Plan deep practice for this
          </Button>
        </StatCard>

        {/* ================= RIGHT CARD ================= */}
        <StatCard className="h-[404px] rounded-2xl border border-brand/10 bg-surface px-6 pt-[23px] pb-6
"
        >
          {/* Header */}
          <div className="h-[39px]">
            <h2 className="text-[18px] font-bold leading-[23px] text-ink">
              JEE Weightage Breakdown
            </h2>

            <p className="mt-1 text-[12px] leading-4 text-muted">
              High weightage topics where you need to improve
            </p>
          </div>

          {/* Table */}
          <div className="mt-5">
            {WEIGHTAGE_TOPICS.map((topic, index) => (
              <div
                key={topic.label}
                className={`
          flex
          h-[54px]
          items-center
          border-t
          border-brand/10
          ${index === 0 ? "border-t-brand/10" : ""}
        `}
              >
                {/* Topic */}
                <div className="w-[148px] pr-2">
                  <p className="text-[14px] font-bold leading-5 text-ink">
                    {topic.label}
                  </p>
                </div>

                {/* Subject */}
                <div className="w-[94px]">
                  <p className="text-[14px] font-medium text-muted">
                    {topic.subject}
                  </p>
                </div>

                {/* Weightage */}
                <div className="w-[95px]">
                  <p className="text-[14px] font-medium text-ink">
                    {topic.priority}
                  </p>
                </div>

                {/* Accuracy */}
                <div className="w-[42px] text-right">
                  <p className="text-[14px] font-medium text-ink">
                    {topic.percent}%
                  </p>
                </div>

                {/* Progress */}
                <div className="ml-3 w-[142px]">
                  <div className="h-[6px] rounded-full bg-ink/10">
                    <div
                      className="h-[6px] rounded-full bg-ink"
                      style={{
                        width: `${topic.percent}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Priority dots */}
                <div className="ml-auto flex gap-1">
                  {[1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`h-[8px] w-[8px] rounded-full ${dot <=
                        (topic.priority === "High"
                          ? 3
                          : topic.priority === "Medium"
                            ? 2
                            : 1)
                        ? "bg-[#FB923C]"
                        : "bg-[#FB923C]/25"
                        }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <button
            className="
      mt-6
      flex
      w-full
      items-center
      justify-center
      gap-1
      text-[12px]
      font-bold
      text-ink
      transition-opacity
      hover:opacity-80
    "
          >
            View full weightage breakdown
            <span>→</span>
          </button>
        </StatCard>

      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[650px_minmax(0,1fr)]">
        <StatCard
          className="
    h-[176px]
    rounded-2xl
    border border-brand/10
    bg-surface
    px-6
    pt-6
    pb-[44px]
  "
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3">
            {/* Left */}
            <div className="w-[233px]">
              <h2 className="text-[18px] font-bold leading-[22.5px] text-ink">
                Mastery Timeline
              </h2>

              <p className="mt-1 text-[12px] leading-4 text-muted">
                Topic distribution across learning phases
              </p>
            </div>

            {/* Right Stats */}
            <div className="flex gap-8">
              {MASTERY.map((item) => (
                <div
                  key={item.label}
                  className="flex min-w-[70px] flex-col items-center"
                >
                  <span className="text-[24px] font-extrabold leading-8 text-ink">
                    {item.count}
                  </span>

                  <span className="mt-[2px] text-[10px] font-bold uppercase tracking-[0.5px] text-muted">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-ink/10">
            {MASTERY.map((item) => (
              <div
                key={item.label}
                className={item.color}
                style={{
                  width: `${(item.count / MASTERY_TOTAL) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted">
              Current Focus
            </span>

            <span className="text-[10px] font-medium text-muted">
              Goal: 25 Topics
            </span>
          </div>
        </StatCard>

        <StatCard
          className="
    h-[176px]
    rounded-2xl
    border border-brand/10
    bg-surface
    px-6
    py-6
    shadow-[0px_2px_8px_rgba(26,26,78,0.08)]
  "
        >
          {/* Header */}
          <div className="flex h-[39px] items-start justify-between">
            <div>
              <h2 className="text-[18px] font-bold leading-[22.5px] text-ink">
                Strongest Topics
              </h2>

              <p className="mt-[2px] text-[12px] leading-4 text-muted">
                Topics you're performing best in
              </p>
            </div>

            <button
              className="
        text-[12px]
        font-bold
        leading-4
        text-ink
        transition-colors
        hover:text-[#FF7A59]
      "
            >
              View all
            </button>
          </div>

          {/* Topics */}
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
            {STRONGEST_TOPICS.map((topic) => (
              <div
                key={topic.id}
                className="flex h-6 items-center justify-between"
              >
                {/* Left */}
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="
              flex
              h-6
              w-6
              shrink-0
              items-center
              justify-center
              rounded
              bg-ink/10
              text-[12px]
              font-bold
              text-ink
            "
                  >
                    {topic.rank}
                  </div>

                  <span
                    className="
              truncate
              text-[11px]
              font-bold
              leading-[16.5px]
              text-ink
            "
                  >
                    {topic.title}
                  </span>
                </div>

                {/* Percentage */}
                <span
                  className="
            ml-3
            shrink-0
            text-[12px]
            font-bold
            leading-4
            text-ink
          "
                >
                  {topic.value}
                </span>
              </div>
            ))}
          </div>
        </StatCard>
      </div>
    </div>
  );
}
