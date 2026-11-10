"use client";

import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { ShareCard, SHARE_SIZES, type ShareFigures, type ShareFormat } from "@/components/rank-gps/ShareCards";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { COPY } from "@/lib/rankGps/labels";
import { downloadPng, sharePng } from "@/lib/share/reviewShare";

type Props = {
  open: boolean;
  onClose: () => void;
  base: { score: number; change: number | null; percentile: { low: number; high: number } | null; rank: { best: number; worst: number } | null; topMove: string | null; week: string };
  firstName: string;
};

/** Privacy first: percentile, rank and name are all OFF until the student switches them on. The image is made on the device. */
export function ShareSheet({ open, onClose, base, firstName }: Props) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const [showPercentile, setShowPercentile] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [showName, setShowName] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const figures: ShareFigures = {
    score: base.score,
    change: base.change,
    percentile: showPercentile ? base.percentile : null,
    rank: showRank ? base.rank : null,
    topMove: base.topMove,
    name: showName && firstName ? firstName : null,
    week: base.week,
  };
  const key = JSON.stringify([format, figures]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(() => {
      const node = card.current;
      if (!node) return;
      const { w, h } = SHARE_SIZES[format];
      toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true, backgroundColor: "#0F1115" })
        .then((url) => { if (live) setPng(url); })
        .catch((err: unknown) => { console.warn("Rank GPS share image failed", err); if (live) setPng(null); });
    }, 60);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` already captures format and figures
  }, [open, key]);

  const file = `prepex-rank-gps-${format}.png`;
  const row = (label: string, checked: boolean, set: (v: boolean) => void, disabled = false) => (
    <div className={`flex items-center justify-between gap-3 py-1 ${disabled ? "opacity-50" : ""}`}>
      <span className="text-[14px] text-ink">{label}</span>
      <Switch checked={checked && !disabled} onChange={(v) => !disabled && set(v)} label={label} />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} ariaLabel={COPY.shareTitle} size="lg">
      <div className="flex flex-col gap-4" data-testid="share-sheet">
        <h2 className="text-lg font-bold text-ink">{COPY.shareTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-tint-strong p-3">
            {png ? (
              // eslint-disable-next-line @next/next/no-img-element -- a data URL made on this device
              <img src={png} alt="Your Rank GPS card" data-testid="rank-gps-share-preview" className="max-h-[420px] rounded-xl border border-border-subtle" />
            ) : (
              <div className="skeleton h-72 w-40 rounded-xl" aria-label="Preparing the image" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="mb-2 flex gap-2" role="group" aria-label="Image size">
              {(["story", "square"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={format === f} onClick={() => { if (f !== format) { setPng(null); setFormat(f); } }} className={`min-h-11 flex-1 rounded-lg border text-[13px] font-bold ${format === f ? "border-brand bg-brand text-white dark:text-[#0b0b1f]" : "border-border-strong text-ink"}`}>
                  {f === "story" ? "Story 1080 × 1920" : "Square 1080 × 1080"}
                </button>
              ))}
            </div>
            {row("Show my percentile", showPercentile, setShowPercentile, !base.percentile)}
            {row("Show my rank", showRank, setShowRank, !base.rank)}
            {row("Show my first name", showName, setShowName, !firstName)}
            <p className="mt-2 text-[12px] text-muted">{COPY.shareNote}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GhostButton disabled={!png} data-testid="rank-gps-share-save" onClick={() => png && void downloadPng(png, file)}>Save image</GhostButton>
          <GhostButton disabled={!png} data-testid="rank-gps-share-send" onClick={() => png && void sharePng(png, file, "My Rank GPS on Prepex").then((ok) => { if (!ok) void downloadPng(png, file); })}>Share</GhostButton>
        </div>
      </div>
      {/* the card the image is made from, kept off screen at its real size */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <ShareCard ref={card} figures={figures} format={format} />
      </div>
    </Modal>
  );
}
