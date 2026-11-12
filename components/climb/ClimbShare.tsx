"use client";

import { toPng } from "html-to-image";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { FORM_TITLES } from "@/components/pexo/forms";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import type { ClimbPage, ClimbTotals } from "@/lib/api/pexo";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { heatLevel } from "@/lib/insights/heatmap";
import { pexoEvent } from "@/lib/pexo/store";
import { downloadPng, sharePng } from "@/lib/share/reviewShare";

/** C6: "Share my climb" as a 1080 x 1920 story or a 1080 x 1080 post, made on the device. Name and mock score are OFF by default. */

const SIZES = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 } } as const;
type Format = keyof typeof SIZES;
/** Fixed colours on purpose: the image must look the same in light and dark. The calendar's own bucket colours. */
const HEAT = ["#2A2F3A", "#6366F133", "#6366F166", "#6366F1AA", "#4F46E5"];

export type ClimbCardData = { totals: ClimbTotals; recent: { date: string; minutes: number }[]; name: string | null; lastMock: string | null };

export const ClimbCard = forwardRef<HTMLDivElement, { data: ClimbCardData; format: Format }>(function ClimbCard({ data, format }, ref) {
  const { w, h } = SIZES[format];
  const t = data.totals;
  const stats: [string, string | number][] = [
    ["Steps climbed", t.steps],
    ["Chapters", t.chapters],
    ["Mocks", t.mocks],
    ["Rocks smashed", t.rocksSmashed],
    ["Gems", t.gems],
    ["Days to JEE", t.daysToExam ?? "-"],
  ];
  const tall = format === "story";
  return (
    <div ref={ref} style={{ width: w, height: h, background: "#0F1115", color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: tall ? 56 : 32, padding: 80, boxSizing: "border-box", fontFamily: "inherit" }}>
      <div style={{ fontSize: 48, fontWeight: 800 }}>{data.name ? `${data.name}'s climb` : "My climb to JEE"}</div>
      {/* the mini path: the last days as steps, the calendar's colours, quiet days flat */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: tall ? 260 : 160 }}>
        {data.recent.map((d, i) => (
          <div key={d.date} style={{ width: 22, height: 20 + i * (tall ? 9 : 5), borderRadius: 8, background: HEAT[heatLevel(d.minutes)] }} />
        ))}
      </div>
      <Pexo form={t.form} mood="proud" size={160} />
      <div style={{ fontSize: 34, color: "#B8BCC8" }}>Pexo, {FORM_TITLES[t.form]}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%" }}>
        {stats.map(([k, v]) => (
          <div key={k} style={{ background: "#1B2030", borderRadius: 24, padding: "24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 64, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 26, color: "#B8BCC8" }}>{k}</div>
          </div>
        ))}
      </div>
      {data.lastMock && <div style={{ fontSize: 34 }}>Last mock: {data.lastMock}</div>}
      <div style={{ fontSize: 36, fontWeight: 700, color: "#FF7A59" }}>prepex.io</div>
    </div>
  );
});

export function climbCardData(totals: ClimbTotals, pages: ClimbPage[], opts: { name: string | null; showMock: boolean }): ClimbCardData {
  const steps = pages.flatMap((p) => p.steps);
  const recent = steps.slice(0, 21).reverse();
  const mock = steps.flatMap((s) => s.checkpoints).find((c) => c.score);
  return { totals, recent: recent.map((s) => ({ date: s.date, minutes: s.minutes })), name: opts.name, lastMock: opts.showMock && mock?.score ? `${mock.score.total}/${mock.score.max}` : null };
}

export function ClimbShareSheet({ open, onClose, totals, pages }: { open: boolean; onClose: () => void; totals: ClimbTotals; pages: ClimbPage[] }) {
  const [format, setFormat] = useState<Format>("story");
  const [showName, setShowName] = useState(false);
  const [showMock, setShowMock] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const first = useStoredFullName().trim().split(/\s+/)[0] ?? "";
  const data = climbCardData(totals, pages, { name: showName && first ? first : null, showMock });
  const key = JSON.stringify([format, data.name, data.lastMock, totals.steps]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(() => {
      if (!card.current) return;
      const { w, h } = SIZES[format];
      toPng(card.current, { width: w, height: h, pixelRatio: 1, cacheBust: true, backgroundColor: "#0F1115" })
        .then((url) => live && setPng(url))
        .catch(() => live && setPng(null));
    }, 60);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures what the image shows
  }, [open, key]);

  const file = `prepex-climb-${format}.png`;
  return (
    <Modal open={open} onClose={onClose} ariaLabel="Share my climb" size="lg">
      <div className="flex flex-col gap-4" data-testid="climb-share">
        <h2 className="text-lg font-bold text-ink">Share my climb</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-tint-strong p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made on this device */}
            {png ? <img src={png} alt="Your climb card" data-testid="climb-share-preview" className="max-h-[420px] rounded-xl border border-border-subtle" /> : <div className="skeleton h-72 w-40 rounded-xl" aria-label="Preparing the image" />}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2" role="group" aria-label="Image size">
              {(["story", "square"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={format === f} onClick={() => f !== format && (setPng(null), setFormat(f))} className={`min-h-11 flex-1 rounded-lg border text-[13px] font-bold ${format === f ? "border-brand bg-brand text-white dark:text-[#0b0b1f]" : "border-border-strong text-ink"}`}>
                  {f === "story" ? "Story" : "Post"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-[14px] text-ink">Show my first name</span>
              <Switch checked={showName} onChange={setShowName} label="Show my first name" />
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-[14px] text-ink">Show my last mock score</span>
              <Switch checked={showMock} onChange={setShowMock} label="Show my last mock score" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GhostButton disabled={!png} onClick={() => png && void downloadPng(png, file).then(() => pexoEvent("shared", { kind: "climb", via: "save" }))}>Save image</GhostButton>
          <GhostButton
            disabled={!png}
            data-testid="climb-share-send"
            onClick={() =>
              png &&
              void sharePng(png, file, "My climb on Prepex").then((ok) => {
                pexoEvent("shared", { kind: "climb", via: ok ? "share" : "save" });
                if (!ok) void downloadPng(png, file);
              })
            }
          >
            Share
          </GhostButton>
        </div>
      </div>
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <ClimbCard ref={card} data={data} format={format} />
      </div>
    </Modal>
  );
}
