import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeftIcon,
  BellIcon,
  // TrophyIcon,
  // FlameIcon,
  // CheckCircleIcon,
  // ClockIcon,
  // BookIcon,
  // TrendingUpIcon,
  CopyIcon,
  PrinterIcon,
  // TrophyIcons,
} from "@/components/ui/icons";
import { FlameIcon,TargetIcon, TrendingUpIcon,CalendarIcon,ClockIcon,LayersIcon,Check,TrophyIcons} from "@/assets/icons";
const STAT_TILES = [
  { icon: <FlameIcon />, text: "14 day streak · new record" },
  { icon: <Check />, text: "27 tasks completed", caption: "Efficiency: 94%" },
  {
    icon: <ClockIcon />,
    text: "19.5 hours focused study",
    caption: "Deep work peak: 4-7 PM",
  },
  { icon: <Check />, text: "Topics: Kinematics, Alcohols", caption: "Mastery level: High" },
];

export default function WeeklyWinJournalPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans']">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Weekly Win Journal</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Journal card */}
      <div className="flex justify-center">
        <div
          data-theme="dark"
          className="w-full max-w-3xl rounded-2xl border border-[#242453] p-6 shadow-[0px_4px_20px_0px_#00000008] sm:p-8"
          style={{
            background:
              "linear-gradient(146.21deg, #201A51 5.35%, #1C1C71 50.22%, #111145 95.09%)",
          }}
        >
          {/* Brand mark */}
          <div className="flex flex-col items-center text-center">
            <Logo size="compact" />


            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[2.4px] leading-[14.4px] text-[#FAF7F2] sm:text-xs">
              Your Week in Wins
            </p>

            <h2 className="mt-1 text-xl font-semibold leading-[31.2px] text-[#FAF7F2] sm:text-2xl">
              The Week of May 12&ndash;18, 2026
            </h2>
            <div className="mt-12 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FAF7F2] p-3 text-[#111145]">
                <TrophyIcons size={24} />
              </span>
            </div>

            <p className="mt-4 text-lg font-semibold text-[#FAF7F2] sm:text-xl">
              Rohan, you came through.
            </p>
          </div>

          {/* Stat tiles */}
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {STAT_TILES.map((tile) => (
              <div
                key={tile.text}
                className="flex items-start gap-3 rounded-xl border border-[#FAF7F214] bg-white/[0.03] p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#13133D] p-3 text-[#FAF7F2] [&>svg]:h-[18.75px] [&>svg]:w-auto">
                  {tile.icon}
                </span>
                <div>
                  <p className="text-base font-bold text-[#FAF7F2]">{tile.text}</p>
                  {tile.caption && (
                    <p className="mt-1 text-sm text-[#8B8998]">{tile.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mock score highlight */}
          <div className="mt-6 flex h-[108px] w-full items-center gap-4 rounded-xl bg-[#FF7A59] px-7 py-[30px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF7F2] text-[#FF7A59]">
              <TrendingUpIcon />
            </span>

            <div className="flex flex-col">
              <p className="text-base font-bold leading-6 text-[#FAF7F2]">
                Mock score: +12 marks
              </p>

              <p className="mt-1 text-sm font-medium leading-5 text-[#1A1A4E]">
                You&apos;re 3.2% ahead of your JEE timeline
              </p>
            </div>
          </div>

          {/* Low energy callout */}
          <div className="mt-4 rounded-2xl border border-[#FAF7F214] bg-[#FAF7F20F] p-5">
            <p className="text-sm text-[#8B8998]">You had 2 low energy days</p>
            <p className="mt-1 text-base font-semibold text-[#FAF7F2]">
              You came back stronger
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 mx-auto flex h-[112px] w-full max-w-[766px] flex-col items-center justify-center gap-5 rounded-2xl border border-[#FAF7F214] bg-[#111145] py-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-[#FAF7F2] px-8 py-2 text-base font-bold text-[#FAF7F2] transition hover:bg-white/5"
          >
            Save to my journal
          </button>

          <button
            type="button"
            className="rounded-lg bg-[#FF7A59] px-8 py-2 text-base font-bold text-[#FAF7F2] transition hover:brightness-110"
          >
            Share
          </button>

          <button
            type="button"
            aria-label="Copy"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FAF7F2] transition hover:bg-white/5"
          >
            <CopyIcon />
          </button>

          <button
            type="button"
            aria-label="Print"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#FAF7F2] transition hover:bg-white/5"
          >
            <PrinterIcon />
          </button>
        </div>
      </div>

      <Link
        href="/home/journal/history"
        className="text-center text-xl font-semibold text-ink"
      >
        View History
      </Link>
    </div>
  );
}