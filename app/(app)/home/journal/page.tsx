import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeftIcon,
  BellIcon,
  TrophyIcon,
  FlameIcon,
  CheckCircleIcon,
  ClockIcon,
  BookIcon,
  TrendingUpIcon,
  CopyIcon,
  PrinterIcon,
} from "@/components/ui/icons";

const STAT_TILES = [
  { icon: <FlameIcon />, text: "14 day streak - new record" },
  { icon: <CheckCircleIcon />, text: "27 tasks completed", caption: "Efficiency: 94%" },
  {
    icon: <ClockIcon />,
    text: "19.5 hours focused study",
    caption: "Deep work peak: 4-7 PM",
  },
  { icon: <BookIcon />, text: "Topics: Kinematics, Alcohols", caption: "Mastery level: High" },
];

export default function WeeklyWinJournalPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
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

      <div className="flex justify-center">
        <div
          data-theme="dark"
          className="w-full max-w-xl rounded-3xl border border-brand/10 bg-surface p-5 text-center shadow-modal sm:p-8"
        >
          <Logo size="compact" />

          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-muted">
            Your Week in Wins
          </p>
          <h2 className="mt-1 text-h2 text-ink">The Week of May 12–18, 2026</h2>

          <div className="mt-4 flex justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-ink">
              <TrophyIcon />
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">Rohan, you came through.</p>

          <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {STAT_TILES.map((tile) => (
              <div
                key={tile.text}
                className="flex items-start gap-2 rounded-xl border border-brand/10 p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                  {tile.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">{tile.text}</p>
                  {tile.caption && (
                    <p className="text-[11px] text-muted">{tile.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-cta p-4 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface/20 text-white">
              <TrendingUpIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Mock score: +12 marks</p>
              <p className="text-xs text-white/80">
                You&apos;re 3% ahead of your JEE timeline
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-tint-strong p-4 text-left">
            <p className="text-xs text-muted">You had 2 low energy days</p>
            <p className="text-sm font-semibold text-ink">You came back stronger</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" size="sm">
          Download journal
        </Button>
        <Button variant="primary" size="sm">
          Share
        </Button>
        
      </div>

      <Link
        href="/home/journal/history"
        className="text-center text-sm font-semibold text-ink underline"
      >
        View History
      </Link>
    </div>
  );
}
