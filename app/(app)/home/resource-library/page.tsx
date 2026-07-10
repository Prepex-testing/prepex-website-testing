import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { TimeBlockSection } from "@/components/home/TimeBlockSection";
import {
  BellIcon,
  SearchIcon,
  PlayIcon,
  FileIcon,
  StarIcon,
  BookIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

const BROWSE_FILTERS = ["Subject", "Chapter", "Type"];

const FEATURED = [
  {
    id: "newtons-laws-foundation",
    icon: <PlayIcon />,
    title: "Newton's Laws Foundation",
    meta: "PW · 28 min",
    rating: "4.8 · 247 reviews",
  },
  {
    id: "coord-geo-cengage",
    icon: <FileIcon />,
    title: "Coordinate Geometry - Cengage Ch24",
    meta: "PDF · 45 pages",
  },
];

const TAGS = ["Lectures", "Concept Map", "PYQs", "NCERT", "Books"];

const PHYSICS_CHAPTERS = [
  { id: "units-measurements", title: "Units & Measurements", chapter: "Chapter 1" },
  { id: "kinematics", title: "Kinematics", chapter: "Chapter 2" },
  { id: "newtons-laws-motion", title: "Newton's Laws of Motion", chapter: "Chapter 3" },
  { id: "work-energy-power", title: "Work, Energy, Power", chapter: "Chapter 4" },
  { id: "rotational-dynamics", title: "Rotational Dynamics", chapter: "Chapter 5" },
  { id: "gravitation", title: "Gravitation", chapter: "Chapter 6" },
  { id: "shm-oscillations", title: "SHM & Oscillations", chapter: "Chapter 7" },
  { id: "waves", title: "Waves", chapter: "Chapter 8" },
  { id: "thermodynamics", title: "Thermodynamics", chapter: "Chapter 9" },
];

export default function ResourceLibraryPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Library</h1>
          <p className="text-sm text-muted">
            Notes, formula sheets, key points, and concept maps. Bookmarkable. Searchable.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex items-center gap-2 rounded-xl border border-brand/10 px-4 py-3">
          <span className="text-muted">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search resources, topics, or formulas..."
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-body-text outline-none placeholder:text-muted/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Browse by
          </span>
          {BROWSE_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-1 rounded-full border border-brand/15 bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-tint-strong"
            >
              {label}
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="text-sm font-bold text-ink">Top This Week</p>
        <p className="text-xs text-muted">Curated for this week</p>

        <div className="mt-4 flex flex-col gap-3">
          {FEATURED.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/10 p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {item.meta}
                  {item.rating && (
                    <>
                      <span>·</span>
                      <StarIcon />
                      {item.rating}
                    </>
                  )}
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 pl-12 sm:w-auto sm:pl-0">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text transition-colors hover:border-cta hover:bg-cta hover:text-white"
                >
                  Open
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text transition-colors hover:border-cta hover:bg-cta hover:text-white"
                >
                  Track as study →
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-semibold text-ink underline"
        >
          View 24 more resources
        </button>
      </div>

      <TimeBlockSection icon={<BookIcon />} title="Physics" meta="18 chapters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PHYSICS_CHAPTERS.map((chapter) => (
            <Link
              key={chapter.id}
              href="/home/resource-library/chapter"
              className="flex flex-col gap-2 rounded-2xl border border-brand/10 bg-surface p-4 hover:border-brand/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink">{chapter.title}</p>
                  <p className="text-xs text-muted">{chapter.chapter}</p>
                </div>
                <ChevronDownIcon className="h-4 w-4 shrink-0 -rotate-90 text-muted" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-tint-strong px-2 py-0.5 text-[10px] font-semibold text-ink"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </TimeBlockSection>
    </div>
  );
}
