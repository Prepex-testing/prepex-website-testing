"use client";

import { useEffect, useRef, useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Period } from "@/lib/api/logsCommon";
import { getShareCard, type ShareCard } from "@/lib/api/practiceLogs";
import { ApiError } from "@/lib/api/http";
import { PeriodToggle } from "@/components/logs/RevisionAnalyticsPanel";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { CARD_H, CARD_W, drawShareCard, layoutShareCard, makeMeasure, renderShareCardBlob, shareFileName } from "@/lib/logs/shareCard";

type Props = {
  subjects: SubjectChapters[];
  /** Called with a short message after a download or share. */
  onNotice: (message: string) => void;
};

/** Pick a period and subject, preview the 9:16 story card, then download or share it. */
export function SharePanel({ subjects, onNotice }: Props) {
  const [period, setPeriod] = useState<Period>("week");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [card, setCard] = useState<ShareCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const chapters = [...(subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reloading the card when a choice changes
    setError(null);
    getShareCard({ period, subjectId, chapterId })
      .then((res) => alive && setCard(res.data))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "We couldn't build your card. Please try again."));
    return () => {
      alive = false;
    };
  }, [period, subjectId, chapterId]);

  // The preview is the same drawing that gets downloaded, so what you see is what you share.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !card) return;
    drawShareCard(ctx, layoutShareCard(card, makeMeasure(ctx)));
  }, [card]);

  async function download() {
    if (!card) return;
    setBusy(true);
    try {
      const blob = await renderShareCardBlob(card);
      if (!blob) throw new Error("no canvas");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = shareFileName(card);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      onNotice("Saved your card.");
    } catch {
      setError("Your browser couldn't make the image. Try a screenshot of the preview instead.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!card) return;
    setBusy(true);
    try {
      const blob = await renderShareCardBlob(card);
      if (!blob) throw new Error("no canvas");
      const file = new File([blob], shareFileName(card), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: card.headline });
        onNotice("Shared.");
      } else {
        await download();
      }
    } catch (err) {
      // closing the share sheet is not an error
      if (!(err instanceof DOMException && err.name === "AbortError")) setError("Couldn't share that. Try Download instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="share-panel">
      <PeriodToggle period={period} onChange={setPeriod} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink" htmlFor="share-subject">
          Subject
          <select
            id="share-subject"
            data-testid="share-subject"
            className={FIELD}
            value={subjectId ?? ""}
            onChange={(e) => {
              setSubjectId(e.target.value ? Number(e.target.value) : null);
              setChapterId(null);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink" htmlFor="share-chapter">
          Chapter (optional)
          <select id="share-chapter" data-testid="share-chapter" className={`${FIELD} disabled:opacity-50`} disabled={subjectId === null} value={chapterId ?? ""} onChange={(e) => setChapterId(e.target.value || null)}>
            <option value="">{subjectId === null ? "Pick a subject first" : "Whole subject"}</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mx-auto w-full max-w-[280px]" data-testid="share-preview">
        <canvas ref={canvas} width={CARD_W} height={CARD_H} role="img" aria-label={card ? `${card.headline}: ${card.hasData ? `${card.accuracy ?? "—"}% accuracy over ${card.questions} questions` : "no practice yet"}` : "Your practice card"} className="w-full rounded-2xl bg-ink shadow-modal" style={{ aspectRatio: "9 / 16" }} />
        {card && !card.hasData && <p className="mt-2 text-center text-[13px] text-muted">Nothing to show for this choice yet. Log some practice first.</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-testid="share-download" disabled={busy || !card} onClick={() => void download()} className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
          Download
        </button>
        <button type="button" data-testid="share-share" disabled={busy || !card} onClick={() => void share()} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
          Share
        </button>
      </div>
    </div>
  );
}
