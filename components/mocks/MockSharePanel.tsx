"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { getMockShareCard, type MockShareCard, type MockTest } from "@/lib/api/mocks";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { layoutMockCard, mockCardFileName, renderMockCardBlob } from "@/lib/insights/mockShareCard";
import { CARD_H, CARD_W, drawShareCard, makeMeasure } from "@/lib/logs/shareCard";
import { labelOfType } from "@/lib/insights/mockMath";

type Props = {
  mocks: MockTest[];
  /** False while the list is still loading (so an empty list is not mistaken for "no mocks"). */
  loaded?: boolean;
  /** Preselect this mock (arriving from "Share" on a row). */
  initialMockId?: string | null;
  onNotice: (message: string) => void;
};

/** Pick a mock, preview the 9:16 story card, download or share it. */
export function MockSharePanel({ mocks, loaded = true, initialMockId = null, onNotice }: Props) {
  const [picked, setPicked] = useState<string | null>(initialMockId);
  // The chosen mock, else the one we were sent here for, else the newest (the list may arrive after the panel).
  const mockId = picked ?? initialMockId ?? mocks[0]?.id ?? null;
  const [card, setCard] = useState<MockShareCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!mockId) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reloading the card when the choice changes
    setError(null);
    getMockShareCard(mockId)
      .then((res) => alive && setCard(res.data))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "We couldn't build your card. Please try again."));
    return () => {
      alive = false;
    };
  }, [mockId]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !card) return;
    drawShareCard(ctx, layoutMockCard(card, makeMeasure(ctx)));
  }, [card]);

  async function download() {
    if (!card) return;
    setBusy(true);
    try {
      const blob = await renderMockCardBlob(card);
      if (!blob) throw new Error("no canvas");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = mockCardFileName(card);
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
      const blob = await renderMockCardBlob(card);
      if (!blob) throw new Error("no canvas");
      const file = new File([blob], mockCardFileName(card), { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: card.headline });
        onNotice("Shared.");
      } else {
        await download();
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError("Couldn't share that. Try Download instead.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && mocks.length === 0) return <div className="h-40 animate-pulse rounded-xl bg-tint-strong" aria-hidden />;

  if (mocks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand/20 p-6 text-center text-[14px] text-muted" data-testid="mock-share-empty">
        Log a mock first, then turn the result into a card.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="mock-share-panel">
      <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink" htmlFor="mock-share-pick">
        Which mock?
        <select id="mock-share-pick" data-testid="mock-share-pick" className={FIELD} value={mockId ?? ""} onChange={(e) => setPicked(e.target.value || null)}>
          {mocks.map((m) => (
            <option key={m.id} value={m.id}>
              {m.dateTaken} · {m.testName ?? labelOfType(m.testType)} · {m.totalMarks}/{m.maxMarks}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mx-auto w-full max-w-[280px]" data-testid="mock-share-preview">
        <canvas
          ref={canvas}
          width={CARD_W}
          height={CARD_H}
          role="img"
          aria-label={card ? `${card.headline}: ${card.totalMarks} out of ${card.maxMarks}` : "Your mock result card"}
          className="w-full rounded-2xl bg-ink shadow-modal"
          style={{ aspectRatio: "9 / 16" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-testid="mock-share-download" disabled={busy || !card} onClick={() => void download()} className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
          Download
        </button>
        <button type="button" data-testid="mock-share-share" disabled={busy || !card} onClick={() => void share()} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
          Share
        </button>
      </div>
    </div>
  );
}
