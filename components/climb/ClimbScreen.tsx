"use client";

import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LEVEL_CLASS } from "@/components/calendar/MonthHeatmap";
import { ClimbShareSheet } from "@/components/climb/ClimbShare";
import { AskSheet } from "@/components/pexo/AskSheet";
import { Pexo } from "@/components/pexo/Pexo";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { FORM_TITLES, isForm } from "@/components/pexo/forms";
import { Sheet } from "@/components/planner/Sheet";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  getClimbFriends,
  getClimbPage,
  type ClimbFriend,
  type ClimbPage,
  type ClimbRock,
  type ClimbStep,
} from "@/lib/api/pexo";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { HEAT_LABEL, heatLevel } from "@/lib/insights/heatmap";
import {
  dayLabel,
  foldQuiet,
  minutesLabel,
  monthLabel,
  testTypeLabel,
  todayTrigger,
} from "@/lib/pexo/climb";
import { offerShare } from "@/lib/pexo/share";
import { pexoMark, pexoReact, pexoSay, usePexo } from "@/lib/pexo/store";
import { subjectColor } from "@/lib/study/subjects";

/**
 * The Climb (Pexo phase 2, part C): one path from the day the student started to JEE day. Peak and what is ahead at the
 * top, today with Pexo, then the past going down to the "Before Prepex" base. Months load as the student scrolls (one
 * request per month, through the cached request layer), and months off screen skip rendering (content-visibility).
 * Calm by design: quiet days are flat neutral stones; rocks are only the backlog the student declared.
 */

type Detail =
  | { kind: "landmark"; step: ClimbStep; i: number }
  | { kind: "checkpoint"; step: ClimbStep; i: number }
  | { kind: "gems"; step: ClimbStep }
  | { kind: "rock"; rock: ClimbRock }
  | { kind: "smashed"; step: ClimbStep; i: number }
  | { kind: "friend"; friend: ClimbFriend };

/** pexoMark decided once per key for this page, so a render that runs twice gets the same answer. */
const decided = new Map<string, boolean>();
function firstTime(mark: string): boolean {
  if (!decided.has(mark)) decided.set(mark, pexoMark(mark, true));
  return decided.get(mark)!;
}
/** Tests only. */
export const resetClimbMarks = () => decided.clear();

function Note({
  trigger,
  context = {},
  k,
  testId,
}: {
  trigger: string;
  context?: Record<string, string | number>;
  k: string;
  testId: string;
}) {
  const line = usePexoLine(trigger, context, k);
  if (!line) return null;
  return (
    <p
      className="flex items-center gap-2 text-[13px] text-body-text dark:text-ink"
      data-testid={testId}
      data-line={line.id}
    >
      <Pexo size={24} mood={line.mood} />
      <span>{line.text}</span>
    </p>
  );
}

const Icon = {
  flag: (color: string) => (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path
        d="M3 15V2"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path d="M3 2.5h9l-2 3 2 3H3z" fill={color === "none" ? "none" : color} stroke={color === "none" ? "currentColor" : "none"} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  ),
  gem: (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path
        d="M4 2h8l3 4-7 8-7-8z"
        fill="var(--saffron)"
        stroke="var(--brand)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  ),
  rubble: (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <circle cx={4} cy={11} r={2.4} fill="currentColor" opacity={0.5} />
      <circle cx={9} cy={12} r={2} fill="currentColor" opacity={0.4} />
      <circle cx={12.5} cy={10} r={1.6} fill="currentColor" opacity={0.5} />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
      <path
        d="M8 1.5l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2 4.1 13.3l.9-4.3-3.2-3 4.3-.5z"
        fill="var(--saffron)"
      />
    </svg>
  ),
};

function Chip({
  children,
  onClick,
  label,
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  testId: string;
}) {
  const cls =
    "inline-flex min-h-8 items-center gap-1 rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[12px] font-semibold text-ink";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${cls} hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-brand`}
      data-testid={testId}
    >
      {children}
    </button>
  ) : (
    <span className={cls} aria-label={label} data-testid={testId}>
      {children}
    </span>
  );
}

function Stone({ step, side }: { step: ClimbStep; side: number }) {
  const level = heatLevel(step.minutes);
  return (
    <div
      className={`flex h-9 w-28 shrink-0 items-center justify-center gap-1 rounded-full text-[12px] font-bold ${step.studied ? LEVEL_CLASS[level] : "bg-tint-strong text-muted"}`}
      style={{ transform: `translateX(${side * 10}px)` }}
      title={HEAT_LABEL[level]}
      data-testid="climb-stone"
      data-level={level}
    >
      {step.planDone && Icon.star}
      {minutesLabel(step.minutes)}
    </div>
  );
}

function StepRowView({
  step,
  index,
  onOpen,
  fresh,
}: {
  step: ClimbStep;
  index: number;
  onOpen: (d: Detail) => void;
  fresh: Set<string>;
}) {
  const side = index % 2 ? 1 : -1;
  return (
    <li
      className="flex items-center gap-3 py-1"
      data-testid="climb-step"
      data-date={step.date}
      data-studied={step.studied}
    >
      <span className="w-14 shrink-0 text-right text-[12px] font-semibold text-muted">
        {dayLabel(step.date)}
      </span>
      <Stone step={step} side={side} />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {step.milestone !== null && (
          <Chip
            label={`${step.milestone} days to JEE, milestone reached`}
            testId="climb-milestone-lit"
          >
            <span className="text-cta">{Icon.flag("var(--cta)")}</span>
            {step.milestone} {step.milestone === 1 ? "day" : "days"}
          </Chip>
        )}
        {step.landmarks.map((l, i) => (
          <Chip
            key={l.chapterId}
            label={`Landmark: ${l.name}`}
            onClick={() => onOpen({ kind: "landmark", step, i })}
            testId="climb-landmark"
          >
            {Icon.flag(subjectColor(l.subjectId))}
            {l.name}
          </Chip>
        ))}
        {step.checkpoints.map((c, i) => (
          <Chip
            key={c.id}
            label={`Mock checkpoint: ${testTypeLabel(c.testType)}`}
            onClick={() => onOpen({ kind: "checkpoint", step, i })}
            testId="climb-checkpoint"
          >
            {Icon.flag("var(--success)")}
            {testTypeLabel(c.testType)}
          </Chip>
        ))}
        {step.smashed.map((r, i) => (
          <Chip
            key={r.id}
            label={`Rock smashed: ${r.chapter}`}
            onClick={() => onOpen({ kind: "smashed", step, i })}
            testId="climb-rubble"
          >
            <span
              className={`text-muted ${fresh.has(r.id) ? "climb-smash" : ""}`}
            >
              {Icon.rubble}
            </span>
            {r.chapter}
          </Chip>
        ))}
        {step.gems > 0 && (
          <Chip
            label={`${step.gems} mistake${step.gems > 1 ? "s" : ""} mastered`}
            onClick={() => onOpen({ kind: "gems", step })}
            testId="climb-gems"
          >
            <span
              className={fresh.has(`gem:${step.date}`) ? "climb-sparkle" : ""}
            >
              {Icon.gem}
            </span>
            {step.gems}
          </Chip>
        )}
      </div>
    </li>
  );
}

function MonthSectionView({
  page,
  onOpen,
  fresh,
  isFirst,
}: {
  page: ClimbPage;
  onOpen: (d: Detail) => void;
  fresh: Set<string>;
  isFirst: boolean;
}) {
  const items = useMemo(
    () => foldQuiet(isFirst ? page.steps.slice(1) : page.steps),
    [page, isFirst],
  );
  return (
    <section
      aria-label={monthLabel(page.month)}
      data-testid="climb-month"
      data-month={page.month}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}
    >
      <h2 className="sticky top-0 z-10 bg-surface-base/90 py-2 text-[13px] font-bold uppercase tracking-wide text-muted backdrop-blur">
        {monthLabel(page.month)}
      </h2>
      <ol className="flex flex-col">
        {items.map((it, i) =>
          it.kind === "step" ? (
            <StepRow
              key={it.step.date}
              step={it.step}
              index={i}
              onOpen={onOpen}
              fresh={fresh}
            />
          ) : (
            <li
              key={`${it.from}-${it.to}`}
              className="flex items-center gap-3 py-1"
              data-testid="climb-quiet"
            >
              <span className="w-14 shrink-0 text-right text-[12px] font-semibold text-muted">
                {dayLabel(it.to)}
              </span>
              <div className="flex h-9 w-28 shrink-0 items-center justify-center rounded-full bg-tint-strong text-[12px] font-bold text-muted">
                {it.count} quiet days
              </div>
              <Note
                trigger="climb.gap"
                k={`gap:${it.from}`}
                testId="climb-gap-line"
              />
            </li>
          ),
        )}
      </ol>
      {page.base && (
        <div
          className="mt-4 flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-4"
          data-testid="climb-base"
        >
          <h3 className="text-[14px] font-bold text-ink">Before Prepex</h3>
          {page.base.n > 0 ? (
            <>
              <Note
                trigger="climb.before_prepex"
                context={{ n: page.base.n }}
                k={`base:${page.base.n}`}
                testId="climb-base-line"
              />
              <ul className="flex flex-wrap gap-1.5">
                {page.base.chapters.map((c) => (
                  <li key={c.name}>
                    <Chip
                      label={`${c.name}, done before Prepex`}
                      testId="climb-base-chapter"
                    >
                      {Icon.flag(subjectColor(c.subjectId))}
                      {c.name}
                    </Chip>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[13px] text-muted">Your climb starts here.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Memoised: appending an older month must not re-render the months (and rows) already on the page. */
const StepRow = memo(StepRowView);
const MonthSection = memo(MonthSectionView);

function Upcoming({
  page,
  onOpen,
}: {
  page: ClimbPage;
  onOpen: (d: Detail) => void;
}) {
  const up = page.upcoming!;
  const next = up.milestones.find((m) => !m.reached) ?? null;
  const rockPx = { small: 28, medium: 40, large: 54 } as const;
  return (
    <div className="flex flex-col gap-3" data-testid="climb-upcoming">
      {up.peak && (
        <div
          className="flex flex-col items-center gap-1 rounded-2xl border border-border-subtle bg-surface p-4 text-center"
          data-testid="climb-peak"
        >
          <svg viewBox="0 0 64 32" className="h-8 w-16" aria-hidden>
            <path
              d="M2 30 L24 6 L34 16 L42 8 L62 30 Z"
              fill="var(--tint-strong, #E8E6F3)"
              stroke="var(--brand)"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            <path d="M42 8 L42 0" stroke="var(--brand)" strokeWidth={1.4} />
            <path d="M42 0.5 h7 l-2 2.5 2 2.5 h-7z" fill="var(--cta)" />
          </svg>
          <p className="text-[15px] font-extrabold text-ink">
            JEE, {dayLabel(up.peak.examDate)}
          </p>
          <p className="text-[13px] text-muted">{up.peak.daysLeft} days away</p>
          <Note
            trigger="climb.exam_peak"
            context={{ days: up.peak.daysLeft }}
            k={`peak:${up.peak.daysLeft}`}
            testId="climb-peak-line"
          />
        </div>
      )}
      {up.milestones.some((m) => !m.reached) && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Milestones ahead"
        >
          {up.milestones
            .filter((m) => !m.reached)
            .map((m) => (
              <Chip
                key={m.days}
                label={`${m.days} days to JEE on ${dayLabel(m.date)}, ahead`}
                testId="climb-milestone-ahead"
              >
                <span className="text-muted">{Icon.flag("none")}</span>
                {m.days} {m.days === 1 ? "day" : "days"} · {dayLabel(m.date)}
              </Chip>
            ))}
        </div>
      )}
      {next && (
        <Note
          trigger="climb.milestone.ahead"
          context={{ days: next.days }}
          k={`ahead:${next.days}`}
          testId="climb-milestone-ahead-line"
        />
      )}
      <div className="flex flex-col gap-2" data-testid="climb-rocks">
        {up.rocks.length > 0 ? (
          <>
            <Note
              trigger="climb.rock.view"
              context={{ n: up.rocks.length }}
              k={`rocks:${up.rocks.length}`}
              testId="climb-rocks-line"
            />
            <ul className="flex flex-wrap items-end gap-3">
              {up.rocks.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: "rock", rock: r })}
                    className="flex flex-col items-center gap-1 rounded-xl p-1 text-[11px] font-semibold text-ink focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label={`Rock: ${r.chapter}, ${r.hoursLeft} hours left`}
                    data-testid="climb-rock"
                    data-size={r.size}
                  >
                    <svg
                      viewBox="0 0 40 30"
                      style={{
                        width: rockPx[r.size],
                        height: rockPx[r.size] * 0.75,
                      }}
                      aria-hidden
                    >
                      <path
                        d="M3 28 Q1 16 9 10 Q14 2 24 4 Q36 6 38 18 Q40 27 32 28 Z"
                        fill="#9CA3AF"
                        stroke="#6B7280"
                        strokeWidth={1.2}
                      />
                      <path
                        d="M12 12 Q16 9 20 11"
                        stroke="#D1D5DB"
                        strokeWidth={1.4}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="max-w-[88px] truncate">{r.chapter}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Note
            trigger="climb.rock.none"
            k="rocks:none"
            testId="climb-rocks-line"
          />
        )}
      </div>
    </div>
  );
}

function Totals({ page }: { page: ClimbPage }) {
  const t = page.totals!;
  const rows: [string, string | number][] = [
    ["Steps climbed", t.steps],
    ["Chapters", t.chapters],
    ["Mocks", t.mocks],
    ["Rocks smashed", t.rocksSmashed],
    ["Gems", t.gems],
    ["Pexo", FORM_TITLES[t.form]],
  ];
  return (
    <dl className="grid grid-cols-3 gap-2" data-testid="climb-totals">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="rounded-xl border border-border-subtle bg-surface px-3 py-2"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {k}
          </dt>
          <dd className="text-[16px] font-extrabold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Friends({ onOpen }: { onOpen: (d: Detail) => void }) {
  const [list, setList] = useState<ClimbFriend[] | null>(null);
  useEffect(() => {
    getClimbFriends()
      .then((r) => setList(r ?? []))
      .catch(() => setList([]));
  }, []);
  if (list === null) return <div className="skeleton h-24 rounded-xl" />;
  if (list.length === 0)
    return (
      <p className="text-[13px] text-muted">
        Follow friends to see them climbing beside you.
      </p>
    );
  return (
    <ul className="flex flex-col gap-1" data-testid="climb-friends">
      {list.map((f) => (
        <li key={f.userId}>
          <button
            type="button"
            onClick={() => onOpen({ kind: "friend", friend: f })}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-tint-strong"
            data-testid="climb-friend"
          >
            <Pexo
              size={24}
              form={f.form}
              mood={f.studiedToday ? "happy" : "calm"}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
              {f.name}
            </span>
            <span className="text-[12px] text-muted">
              {f.steps} steps{f.studiedToday ? " · studied today" : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ListView({ pages }: { pages: ClimbPage[] }) {
  return (
    <div className="flex flex-col gap-4" data-testid="climb-list">
      {pages.map((p) => (
        <section key={p.month} aria-label={monthLabel(p.month)}>
          <h2 className="text-[14px] font-bold text-ink">
            {monthLabel(p.month)}
          </h2>
          <ul className="mt-1 flex flex-col gap-1 text-[13px] text-body-text dark:text-ink">
            {p.steps.map((s) => {
              const parts = [minutesLabel(s.minutes)];
              if (s.planDone) parts.push("plan done");
              for (const l of s.landmarks) parts.push(`landmark ${l.name}`);
              for (const c of s.checkpoints)
                parts.push(
                  `${testTypeLabel(c.testType)}${c.score ? ` ${c.score.total}/${c.score.max}` : ""}`,
                );
              for (const r of s.smashed)
                parts.push(`rock smashed: ${r.chapter}`);
              if (s.gems) parts.push(`${s.gems} gem${s.gems > 1 ? "s" : ""}`);
              if (s.milestone !== null)
                parts.push(`${s.milestone} days to JEE`);
              return (
                <li key={s.date}>
                  <b className="font-semibold">{dayLabel(s.date)}</b>:{" "}
                  {parts.join(", ")}
                </li>
              );
            })}
          </ul>
          {p.base && (
            <p className="mt-1 text-[13px]">
              Before Prepex: {p.base.n} chapter{p.base.n === 1 ? "" : "s"}
              {p.base.n
                ? ` (${p.base.chapters.map((c) => c.name).join(", ")})`
                : ""}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function DetailSheet({
  detail,
  onClose,
  gemsTotal,
}: {
  detail: Detail | null;
  onClose: () => void;
  gemsTotal: number;
}) {
  let title = "";
  let body: ReactNode = null;
  let line: {
    trigger: string;
    context: Record<string, string | number>;
  } | null = null;
  if (detail?.kind === "landmark") {
    const l = detail.step.landmarks[detail.i]!;
    title = l.name;
    line = { trigger: "climb.landmark", context: { chapter: l.name } };
    body = (
      <>
        <p className="text-[13px] text-muted">
          {l.subject} · completed {dayLabel(detail.step.date)}
        </p>
        <Link
          href={`/syllabus/${l.chapterId}`}
          className="text-[13px] font-semibold text-brand underline"
        >
          Accuracy and revision in Syllabus
        </Link>
      </>
    );
  } else if (detail?.kind === "checkpoint") {
    const c = detail.step.checkpoints[detail.i]!;
    title = testTypeLabel(c.testType);
    line = c.score
      ? {
          trigger: "climb.checkpoint",
          context: { score: `${c.score.total}/${c.score.max}` },
        }
      : { trigger: "climb.checkpoint.no_score", context: {} };
    body = (
      <>
        <p className="text-[13px] text-muted">{dayLabel(detail.step.date)}</p>
        <Link
          href="/analytics/rank-gps"
          className="text-[13px] font-semibold text-brand underline"
        >
          Mistake autopsy in Rank GPS
        </Link>
      </>
    );
  } else if (detail?.kind === "gems") {
    title = "Mastered mistakes";
    line = { trigger: "climb.gem", context: { n: gemsTotal } };
    body = (
      <>
        <p className="text-[13px] text-muted">
          {detail.step.gems} on {dayLabel(detail.step.date)}
        </p>
        <Link
          href="/notebooks"
          className="text-[13px] font-semibold text-brand underline"
        >
          Your mistakes notebook
        </Link>
      </>
    );
  } else if (detail?.kind === "smashed") {
    title = detail.step.smashed[detail.i]!.chapter;
    line = { trigger: "climb.rock.smashed", context: {} };
    body = (
      <p className="text-[13px] text-muted">
        Backlog cleared on {dayLabel(detail.step.date)}
      </p>
    );
  } else if (detail?.kind === "rock") {
    const r = detail.rock;
    title = r.chapter;
    body = (
      <>
        <p className="text-[13px] text-muted">
          {r.hoursLeft} hours left
          {r.lane
            ? ` · ${r.lane === "must" ? "Must" : r.lane === "smart" ? "Smart" : "Later"} lane`
            : ""}
        </p>
        <div className="flex gap-2">
          <GhostButton
            className="min-h-11"
            data-testid="climb-rock-start"
            onClick={() =>
              startFocusSession({
                originSource: "backlog_tab",
                originId: r.backlogId,
                ...(r.subjectId ? { subject: String(r.subjectId) } : {}),
                ...(r.chapterId ? { chapter: r.chapterId } : {}),
              })
            }
          >
            Start
          </GhostButton>
          <Link
            href="/logs/backlog"
            className="flex min-h-11 items-center text-[13px] font-semibold text-brand underline"
          >
            Open backlog
          </Link>
        </div>
      </>
    );
  } else if (detail?.kind === "friend") {
    title = detail.friend.name;
    line = {
      trigger: "climb.friend",
      context: { friend: detail.friend.name, steps: detail.friend.steps },
    };
    body = (
      <p className="text-[13px] text-muted">
        {
          FORM_TITLES[
            isForm(detail.friend.form) ? detail.friend.form : "aspirant"
          ]
        }
      </p>
    );
  }
  const pick = usePexoLine(
    line?.trigger ?? null,
    line?.context ?? {},
    detail ? `${detail.kind}:${title}` : "",
  );
  return (
    <Sheet
      open={detail !== null}
      onClose={onClose}
      title={title || "Climb"}
      data-testid="climb-detail"
    >
      <div className="flex flex-col gap-3">
        {pick && (
          <PexoBubble pick={pick} size={48} testId="climb-detail-line" />
        )}
        {body}
      </div>
    </Sheet>
  );
}

export function ClimbScreen() {
  const { enabled, state, transient } = usePexo();
  const [pages, setPages] = useState<ClimbPage[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [view, setView] = useState<"path" | "list">("path");
  const [friends, setFriends] = useState(false);
  const [share, setShare] = useState(false);
  const [ask, setAsk] = useState(false);
  const [hop, setHop] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [showStatus, setShowStatus] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);
  const climbOn =
    enabled && state?.climb !== null && state?.climb !== undefined;

  const loadFirst = useCallback(async () => {
    try {
      const first = await getClimbPage(null);
      setPages(first ? [first] : []);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!climbOn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first month loads once Pexo's state says the Climb is on
    void loadFirst();
  }, [climbOn, loadFirst]);

  const nextCursor = pages.at(-1)?.nextCursor ?? null;
  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const page = await getClimbPage(nextCursor);
      if (page)
        setPages((p) =>
          p.some((x) => x.month === page.month) ? p : [...p, page],
        );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading]);

  // older months as the student scrolls down (no polling: one request per month, when it comes into view)
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !nextCursor || typeof IntersectionObserver === "undefined")
      return;
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && void loadMore(),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, nextCursor]);

  const first = pages[0] ?? null;
  const totals = first?.totals ?? null;
  const today = first?.steps[0] ?? null;

  // Pexo hops onto today's step when it completes while the Climb is open (the XP summary tells us)
  const studiedNow = state?.climb?.todayStudied ?? null;
  const prevStudied = useRef<boolean | null>(null);
  useEffect(() => {
    if (studiedNow === null) return;
    if (prevStudied.current === false && studiedNow) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-off moment when today's step completes
      setHop(true);
      void loadFirst();
      pexoReact(
        "climb.step.today",
        { steps: state?.climb?.steps ?? 0 },
        { kind: "celebration" },
      );
    }
    prevStudied.current = studiedNow;
  }, [studiedNow, state?.climb?.steps, loadFirst]);

  // one moment per open, newest first: a milestone reached, a rock smashed, a gem; each once; then share offers
  useEffect(() => {
    if (!first?.upcoming || !totals) return;
    const lit = new Set<string>();
    const reached = first.upcoming.milestones
      .filter((m) => m.reached)
      .sort((a, b) => a.days - b.days)[0];
    const smashedToday = today?.smashed ?? [];
    let said = false;
    if (reached && pexoMark(`climb.milestone.${reached.days}`, true)) {
      pexoReact(
        "climb.milestone.reached",
        { days: reached.days },
        { kind: "celebration" },
      );
      offerShare({
        kind: "streak",
        title: `${reached.days} days to JEE`,
        detail: `${totals.steps} steps climbed`,
        mood: "proud",
      });
      said = true;
    }
    for (const r of smashedToday) {
      if (pexoMark(`climb.smash.${r.id}`, true)) {
        lit.add(r.id);
        if (!said) {
          pexoReact("climb.rock.smashed", {}, { kind: "celebration" });
          said = true;
        }
      }
    }
    if (today && today.gems > 0 && pexoMark(`climb.gem.${today.date}`, true))
      lit.add(`gem:${today.date}`);
    for (const n of [30, 100])
      if (totals.steps >= n && pexoMark(`climb.steps.${n}`, true))
        offerShare({
          kind: "streak",
          title: `${n} steps climbed`,
          mood: "proud",
        });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- markers that animate once
    if (lit.size) setFresh(lit);
  }, [first, totals, today]);

  const firstOpen = enabled && firstTime("climb.intro.seen");
  const status = totals ? todayTrigger(totals) : null;
  const empty = totals !== null && totals.steps === 0;
  const todayLine = usePexoLine(
    !totals
      ? null
      : empty
        ? "empty.climb"
        : firstOpen
          ? "climb.intro"
          : showStatus
            ? status!.trigger
            : "climb.today_marker",
    !totals || empty || firstOpen
      ? {}
      : showStatus
        ? status!.context
        : { day: totals.day },
    `${firstOpen}:${showStatus}:${status?.trigger}:${totals?.steps}`,
  );

  if (!enabled)
    return (
      <p className="p-6 text-[14px] text-muted">The Climb comes with Pexo.</p>
    );
  if (!climbOn)
    return (
      <p className="p-6 text-[14px] text-muted" data-testid="climb-off">
        The Climb is not available right now.
      </p>
    );
  if (!first && !error) return <PageLoader label="Loading your climb" />;

  const gemsTotal = totals?.gems ?? 0;
  const side = totals && (
    <div className="flex flex-col gap-3">
      {first && <Totals page={first} />}
      <div className="flex flex-wrap gap-2">
        <GhostButton
          className="min-h-11"
          aria-pressed={view === "list"}
          onClick={() => setView(view === "list" ? "path" : "list")}
          data-testid="climb-view-toggle"
        >
          {view === "list" ? "View as path" : "View as list"}
        </GhostButton>
        <GhostButton
          className="min-h-11"
          aria-pressed={friends}
          onClick={() => setFriends(!friends)}
          data-testid="climb-friends-toggle"
        >
          Friends
        </GhostButton>
        <GhostButton
          className="min-h-11"
          onClick={() => setShare(true)}
          data-testid="climb-share-open"
        >
          Share my climb
        </GhostButton>
      </div>
      {friends && <Friends onOpen={setDetail} />}
    </div>
  );

  return (
    <div
      className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 p-4 sm:p-6"
      data-testid="climb"
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[22px] font-extrabold text-ink">Your climb</h1>
        {totals && (
          <span className="text-[13px] font-semibold text-muted">
            Day {totals.day}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* one side panel: above the path on a phone, a sticky column on the right on desktop */}
        <aside
          className="flex w-full flex-col gap-3 lg:sticky lg:top-4 lg:order-last lg:w-[300px] lg:shrink-0"
          aria-label="Totals and filters"
        >
          {side}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger"
            >
              We couldn&apos;t load your climb.{" "}
              <button
                type="button"
                className="font-bold underline"
                onClick={() => void loadFirst()}
              >
                Try again
              </button>
            </p>
          )}
          {view === "list" ? (
            <ListView pages={pages} />
          ) : (
            first && (
              <div className="stagger flex flex-col gap-4">
                {first.upcoming && <Upcoming page={first} onOpen={setDetail} />}
                {/* today, with Pexo in its form */}
                <div
                  className="flex flex-col gap-2 rounded-2xl border-2 border-cta/40 bg-surface p-4"
                  data-testid="climb-today"
                  data-studied={totals?.todayStudied ?? false}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={hop ? "climb-hop" : ""}
                      data-testid="climb-today-pexo"
                    >
                      {todayLine && !transient ? (
                        <PexoBubble
                          pick={todayLine}
                          size={96}
                          onTap={() => setShowStatus((s) => !s)}
                          actions={[
                            {
                              label:
                                pexoSay("ask.title", {}, { silent: true })
                                  ?.text ?? "What should I do now?",
                              onClick: () => setAsk(true),
                              testId: "climb-ask",
                            },
                          ]}
                          testId="climb-today-bubble"
                        />
                      ) : (
                        <Pexo
                          size={96}
                          mood={totals?.todayStudied ? "proud" : "curious"}
                        />
                      )}
                    </div>
                  </div>
                  {today && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-right text-[12px] font-bold text-cta">
                        Today
                      </span>
                      <Stone step={today} side={0} />
                    </div>
                  )}
                </div>
                {pages.map((p, i) => (
                  <MonthSection
                    key={p.month}
                    page={p}
                    onOpen={setDetail}
                    fresh={fresh}
                    isFirst={i === 0}
                  />
                ))}
                <div ref={sentinel} aria-hidden className="h-1" />
                {nextCursor && (
                  <GhostButton
                    className="self-center"
                    disabled={loading}
                    onClick={() => void loadMore()}
                    data-testid="climb-more"
                  >
                    {loading ? "Loading" : "Earlier months"}
                  </GhostButton>
                )}
              </div>
            )
          )}
        </div>
      </div>
      <DetailSheet
        detail={detail}
        onClose={() => setDetail(null)}
        gemsTotal={gemsTotal}
      />
      <AskSheet open={ask} onClose={() => setAsk(false)} />
      {totals && first && (
        <ClimbShareSheet
          open={share}
          onClose={() => setShare(false)}
          totals={totals}
          pages={pages}
        />
      )}
    </div>
  );
}
