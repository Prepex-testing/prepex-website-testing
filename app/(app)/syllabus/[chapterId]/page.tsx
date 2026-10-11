"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DatesPickerModal, type PickedDates } from "@/components/insights/DatesPickerModal";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { CountSteppers, TheorySwitch } from "@/components/syllabus/ChapterControls";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { getChapterDetail, markChapter, scheduleChapter, type ChapterDetail, type CountAspect, type TheoryStatus } from "@/lib/api/syllabus";
import { DIFFICULTY_LABEL, hoursLabel, STRENGTH_STYLE, strengthKey, weightageLabel } from "@/lib/insights/labels";
import { PRACTICE_SOURCES, labelOf } from "@/lib/logs/labels";
import { formatMinutes } from "@/lib/study/format";

const msg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const CARD = "flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4";

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = params.chapterId;
  const toast = useToast();
  const [detail, setDetail] = useState<ChapterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetail((await getChapterDetail(chapterId)).data);
    } catch (err) {
      setError(msg(err, "We couldn't load this chapter. Please try again."));
    }
  }, [chapterId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the chapter on arrival
    void load();
  }, [load]);

  async function mark(input: { aspect: "theory"; value: TheoryStatus } | { aspect: CountAspect; value: number }) {
    setBusy(true);
    setActionError(null);
    try {
      await markChapter(chapterId, input);
      await load();
      toast.show("Saved.");
    } catch (err) {
      setActionError(msg(err, "Couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function schedule(p: PickedDates) {
    setBusy(true);
    setActionError(null);
    try {
      await scheduleChapter(chapterId, p);
      setScheduling(false);
      await load();
      toast.show(`Scheduled on ${p.dates.length} day${p.dates.length === 1 ? "" : "s"}. It shows up when each day's plan is built.`);
    } catch (err) {
      setActionError(msg(err, "Couldn't schedule that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !error) return <PageLoader label="Loading the chapter…" />;
  if (!detail) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="chapter-error">
        <ProfileSubpageHeader title="Chapter" backHref="/syllabus" />
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
        <Link href="/syllabus" className="text-[14px] font-bold text-brand underline dark:text-ink">
          Back to the syllabus
        </Link>
      </div>
    );
  }

  const c = detail.chapter;
  const p = c.progress;
  const style = STRENGTH_STYLE[strengthKey(p.strengthLabel)];
  const { linked } = detail;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl lg:p-8" data-testid="chapter-page">
      <ProfileSubpageHeader title={c.name} backHref="/syllabus" />

      <section className={CARD} aria-label="Overview">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: style.bg, color: style.fg }} data-testid="chapter-strength">
            {style.label}
          </span>
          <span className="text-[13px] font-semibold text-muted">
            {c.subjectName}
            {c.class ? ` · Class ${c.class}` : ""}
            {c.ncertChapterNumber ? ` · NCERT ${c.ncertChapterNumber}` : ""}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="chapter-stats">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Studied</dt>
            <dd className="text-[20px] font-extrabold text-ink" data-testid="chapter-hours">
              {hoursLabel(p.hours)}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Accuracy</dt>
            <dd className="text-[20px] font-extrabold text-ink" data-testid="chapter-accuracy">
              {p.accuracy !== null ? `${Math.round(p.accuracy)}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Plan for</dt>
            <dd className="text-[20px] font-extrabold text-ink">{c.estimatedHours ? `~${hoursLabel(c.estimatedHours)}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-muted">Paper share</dt>
            <dd className="text-[20px] font-extrabold text-ink" title="An editorial estimate, not an official figure">
              {weightageLabel(c.weightage)}
            </dd>
          </div>
        </dl>
        {c.typicalDifficulty && <p className="text-[13px] text-muted">Typically {DIFFICULTY_LABEL[c.typicalDifficulty].toLowerCase()} for JEE students.</p>}
        {p.questionsAttempted > 0 && p.questionsAttempted < 10 && <p className="text-[13px] text-muted">Rated from 10 practice questions; you have {p.questionsAttempted} so far.</p>}
      </section>

      {actionError && (
        <p role="alert" data-testid="chapter-action-error" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      <section className={CARD} aria-label="Theory">
        <h2 className="text-[16px] font-extrabold text-ink">Theory</h2>
        <TheorySwitch value={p.theoryStatus} busy={busy} onChange={(v) => void mark({ aspect: "theory", value: v })} />
        <button type="button" data-testid="schedule-open" onClick={() => { setActionError(null); setScheduling(true); }} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F]">
          Schedule study
        </button>
      </section>

      <section className={CARD} aria-label="Work done">
        <h2 className="text-[16px] font-extrabold text-ink">What you&apos;ve done</h2>
        <CountSteppers counts={p.counts} busy={busy} onChange={(aspect, value) => void mark({ aspect, value })} />
      </section>

      {c.topics.length > 0 && (
        <section className={CARD} aria-label="Topics">
          <h2 className="text-[16px] font-extrabold text-ink">Topics</h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] text-body-text dark:text-ink" data-testid="chapter-topics">
            {c.topics.map((t) => (
              <li key={t.number}>{t.name}</li>
            ))}
          </ol>
        </section>
      )}

      <section className={CARD} aria-label="Linked activity" data-testid="chapter-linked">
        <h2 className="text-[16px] font-extrabold text-ink">Linked activity</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
          <Link href="/sessions" className="rounded-xl border border-brand/10 p-3 hover:bg-tint-strong">
            <p className="text-[20px] font-extrabold text-ink" data-testid="linked-sessions">{linked.studySessions.length}</p>
            <p className="text-[12px] font-semibold text-muted">recent sessions</p>
          </Link>
          <Link href="/logs/practice" className="rounded-xl border border-brand/10 p-3 hover:bg-tint-strong">
            <p className="text-[20px] font-extrabold text-ink" data-testid="linked-practice">{linked.practice.length}</p>
            <p className="text-[12px] font-semibold text-muted">practice logs</p>
          </Link>
          <Link href="/mistakes" className="rounded-xl border border-brand/10 p-3 hover:bg-tint-strong">
            <p className="text-[20px] font-extrabold text-ink" data-testid="linked-mistakes">{linked.mistakes.active}</p>
            <p className="text-[12px] font-semibold text-muted">open mistakes{linked.mistakes.dueNow > 0 ? ` · ${linked.mistakes.dueNow} due` : ""}</p>
          </Link>
          <Link href="/logs/mocks" className="rounded-xl border border-brand/10 p-3 hover:bg-tint-strong">
            <p className="text-[20px] font-extrabold text-ink" data-testid="linked-mocks">{linked.mocks.length}</p>
            <p className="text-[12px] font-semibold text-muted">mocks flagged weak</p>
          </Link>
        </div>

        {linked.studySessions.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px]" data-testid="linked-session-list">
            {linked.studySessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="text-body-text dark:text-ink">{day(s.loggedAt)} · {s.source === "focus_mode" ? "Focus" : "Logged"}{s.topic ? ` · ${s.topic}` : ""}</span>
                <span className="font-bold text-ink">{formatMinutes(s.minutes)}</span>
              </li>
            ))}
          </ul>
        )}
        {linked.practice.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px]">
            {linked.practice.map((x) => (
              <li key={x.id} className="flex justify-between gap-3">
                <span className="text-body-text dark:text-ink">{day(x.loggedAt)} · {labelOf(PRACTICE_SOURCES, x.source as never, x.source)}</span>
                <span className="font-bold text-ink">{x.correct}/{x.attempted}{x.accuracy !== null ? ` · ${x.accuracy}%` : ""}</span>
              </li>
            ))}
          </ul>
        )}
        {linked.mocks.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px]">
            {linked.mocks.map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="text-body-text dark:text-ink">{m.date} · {m.name ?? "Mock"}</span>
                <span className="font-bold text-ink">{m.scorePercent}%</span>
              </li>
            ))}
          </ul>
        )}
        {linked.planned.length > 0 && (
          <div data-testid="linked-planned">
            <p className="text-[13px] font-bold text-ink">Coming up</p>
            <ul className="mt-1 flex flex-col gap-1 text-[13px]">
              {linked.planned.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="text-body-text dark:text-ink">{a.title ?? "Pinned task"}</span>
                  <span className="font-bold text-ink">{a.date}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <DatesPickerModal
        open={scheduling}
        onClose={() => setScheduling(false)}
        title="Schedule study"
        subject={`${p.theoryStatus === "studied" ? "Revise" : "Study"} ${c.name}`}
        defaultMinutes={60}
        busy={busy}
        error={actionError}
        onConfirm={(picked) => void schedule(picked)}
      />

      <Toast state={toast} />
    </div>
  );
}
