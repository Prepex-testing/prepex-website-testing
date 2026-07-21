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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[38%_62%]">
        <StatCard className="h-[546px] p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold leading-none text-[#FAF7F2]">
              Building Back to Pace
            </h2>
          </div>

          {/* Coverage Header */}
          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-[#FAF7F2]">
              Syllabus Coverage
            </h3>

            <div className="flex flex-col items-end gap-1">
              {/* Circular Progress */}
              <div className="relative h-16 w-16">
                <svg
                  className="h-16 w-16 -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    d="M18 2.5
              a15.5 15.5 0 1 1 0 31
              a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="rgba(255,255,255,.18)"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M18 2.5
              a15.5 15.5 0 1 1 0 31
              a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="#FAF7F2"
                    strokeWidth="2.5"
                    strokeDasharray="53 100"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    53%
                  </span>
                </div>
              </div>

              <p className="text-right text-[10px] font-bold uppercase tracking-[0.5px] text-[#A0A0B0]">
                Overall Syllabus Covered
              </p>
            </div>
          </div>

          {/* Subjects */}
          <div className="mt-8 flex flex-col gap-6">
            {SYLLABUS_SUBJECTS.map((subject) => (
              <div
                key={subject.label}
                className="flex gap-3"
              >
                {/* Badge */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <span className="text-base font-bold text-white">
                    {subject.short}
                  </span>
                </div>

                {/* Right */}
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {subject.label}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {subject.percent}%
                      </span>

                      <span className="text-[11px] text-[#A0A0B0]">
                        {subject.fraction}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={`h-full rounded-full ${subject.short === "C"
                        ? "bg-[#5B21B6]"
                        : "bg-[#FAF7F2]"
                        }`}
                      style={{
                        width: `${subject.percent}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-[10px] text-[#A0A0B0]">
                    {subject.fraction} mins retained
                  </p>
                </div>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard
          className="min-h-[546px] p-6"
          title="Precision Gap Analysis"
          subtitle="Highest growth potential in these areas"
        >
          <PrecisionRankedList items={PRECISION_GAPS} />

          <button
            className="
      mt-6
      flex
      w-full
      items-center
      justify-center
      gap-2
      text-xs
      font-bold
      text-white
    "
          >
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
    border border-white/10
    bg-[#111145]
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
        bg-white
        px-3
        text-[10px]
        font-bold
        uppercase
        leading-[15px]
        tracking-normal
        text-[#111145]
      "
            >
              Active Focus
            </span>
          </div>

          {/* Title Section */}
          <div className="mt-6 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[1px] text-[#A0A0B0]">
              Mathematics
            </p>

            <h2 className="text-[20px] font-bold leading-[27.5px] text-[#FAF7F2]">
              Coordinate Geometry –
              <br />
              Common Tangents
            </h2>

            <p className="text-xs leading-4 text-[#A0A0B0]">
              Highest impact if you crack this.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10px] font-bold uppercase text-[#A0A0B0]">
                Accuracy
              </p>

              <p className="mt-1 text-[30px] font-extrabold leading-9 text-[#FAF7F2]">
                38%
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-[#A0A0B0]">
                JEE Weightage
              </p>

              <p className="mt-1 text-[30px] font-extrabold leading-9 text-[#FAF7F2]">
                High
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            className="mt-10 h-14 w-full rounded-xl border  bg-transparent px-4 py-4 text-base font-bold text-[#FAF7F2] transition-all duration-200 hover:border-[#FF7A59] hover:bg-[#FF7A59] hover:text-[#FAF7F2]"
          >
            Plan deep practice for this
          </Button>
        </StatCard>

        {/* ================= RIGHT CARD ================= */}
        <StatCard className="h-[404px] rounded-2xl border border-white/10 bg-[#111145] px-6 pt-[23px] pb-6
"
        >
          {/* Header */}
          <div className="h-[39px]">
            <h2 className="text-[18px] font-bold leading-[23px] text-[#FAF7F2]">
              JEE Weightage Breakdown
            </h2>

            <p className="mt-1 text-[12px] leading-4 text-[#A0A0B0]">
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
          border-white/10
          ${index === 0 ? "border-t-white/10" : ""}
        `}
              >
                {/* Topic */}
                <div className="w-[148px] pr-2">
                  <p className="text-[14px] font-bold leading-5 text-[#FAF7F2]">
                    {topic.label}
                  </p>
                </div>

                {/* Subject */}
                <div className="w-[94px]">
                  <p className="text-[14px] font-medium text-[#A0A0B0]">
                    {topic.subject}
                  </p>
                </div>

                {/* Weightage */}
                <div className="w-[95px]">
                  <p className="text-[14px] font-medium text-[#FAF7F2]">
                    {topic.priority}
                  </p>
                </div>

                {/* Accuracy */}
                <div className="w-[42px] text-right">
                  <p className="text-[14px] font-medium text-[#FAF7F2]">
                    {topic.percent}%
                  </p>
                </div>

                {/* Progress */}
                <div className="ml-3 w-[142px]">
                  <div className="h-[6px] rounded-full bg-white/20">
                    <div
                      className="h-[6px] rounded-full bg-[#FAF7F2]"
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
      text-[#FAF7F2]
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
    border border-white/10
    bg-[#111145]
    px-6
    pt-6
    pb-[44px]
  "
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3">
            {/* Left */}
            <div className="w-[233px]">
              <h2 className="text-[18px] font-bold leading-[22.5px] text-[#FAF7F2]">
                Mastery Timeline
              </h2>

              <p className="mt-1 text-[12px] leading-4 text-[#A0A0B0]">
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
                  <span className="text-[24px] font-extrabold leading-8 text-[#FAF7F2]">
                    {item.count}
                  </span>

                  <span className="mt-[2px] text-[10px] font-bold uppercase tracking-[0.5px] text-[#A0A0B0]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-white/15">
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
            <span className="text-[10px] font-medium text-[#A0A0B0]">
              Current Focus
            </span>

            <span className="text-[10px] font-medium text-[#A0A0B0]">
              Goal: 25 Topics
            </span>
          </div>
        </StatCard>

        <StatCard
          className="
    h-[176px]
    rounded-2xl
    border border-white/10
    bg-[#111145]
    px-6
    py-6
    shadow-[0px_2px_8px_rgba(26,26,78,0.08)]
  "
        >
          {/* Header */}
          <div className="flex h-[39px] items-start justify-between">
            <div>
              <h2 className="text-[18px] font-bold leading-[22.5px] text-[#FAF7F2]">
                Strongest Topics
              </h2>

              <p className="mt-[2px] text-[12px] leading-4 text-[#A0A0B0]">
                Topics you're performing best in
              </p>
            </div>

            <button
              className="
        text-[12px]
        font-bold
        leading-4
        text-[#FAF7F2]
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
              bg-white/8
              text-[12px]
              font-bold
              text-[#FAF7F2]
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
              text-[#FAF7F2]
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
            text-[#FAF7F2]
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
