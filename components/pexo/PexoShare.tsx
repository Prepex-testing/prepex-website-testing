"use client";

import { toPng } from "html-to-image";
import { forwardRef, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { clearShare, onShare, pendingShare, type ShareMoment } from "@/lib/pexo/share";
import { pexoEvent, usePexo } from "@/lib/pexo/store";
import { downloadPng, sharePng } from "@/lib/share/reviewShare";

/** The share card, at its export size (1080 square). Fixed colours on purpose: the image must look the same everywhere. */
const MomentCard = forwardRef<HTMLDivElement, { moment: ShareMoment }>(function MomentCard({ moment }, ref) {
  return (
    <div ref={ref} style={{ width: 1080, height: 1080, background: "#0F1115", color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, fontFamily: "inherit", padding: 96, boxSizing: "border-box" }}>
      <Pexo size={160} mood={moment.mood} />
      <div style={{ fontSize: 88, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>{moment.title}</div>
      {moment.detail && <div style={{ fontSize: 44, color: "#B8BCC8", textAlign: "center" }}>{moment.detail}</div>}
      <div style={{ fontSize: 36, fontWeight: 700, color: "#FF7A59", marginTop: 32 }}>prepex.io</div>
    </div>
  );
});

function ShareCardSheet({ moment, onClose }: { moment: ShareMoment; onClose: () => void }) {
  const [png, setPng] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      if (!card.current) return;
      toPng(card.current, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true, backgroundColor: "#0F1115" })
        .then((url) => live && setPng(url))
        .catch(() => live && setPng(null));
    }, 60);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [moment]);
  const file = `prepex-${moment.kind}.png`;
  return (
    <Modal open onClose={onClose} ariaLabel="Share card" size="md">
      <div className="flex flex-col gap-3" data-testid="pexo-share-sheet">
        <h2 className="text-lg font-bold text-ink">Share card</h2>
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-tint-strong p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made on this device */}
          {png ? <img src={png} alt={moment.title} className="max-h-[360px] rounded-xl" data-testid="pexo-share-preview" /> : <div className="skeleton size-56 rounded-xl" aria-label="Preparing the image" />}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GhostButton disabled={!png} onClick={() => png && void downloadPng(png, file).then(() => pexoEvent("shared", { kind: moment.kind, via: "save" }))}>Save image</GhostButton>
          <GhostButton
            disabled={!png}
            data-testid="pexo-share-send"
            onClick={() =>
              png &&
              void sharePng(png, file, moment.title).then((ok) => {
                pexoEvent("shared", { kind: moment.kind, via: ok ? "share" : "save" });
                if (!ok) void downloadPng(png, file);
              })
            }
          >
            Share
          </GhostButton>
        </div>
      </div>
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <MomentCard ref={card} moment={moment} />
      </div>
    </Modal>
  );
}

/** Mounted with the Pexo layer: the day's one share offer, after the reaction bubble has gone. */
export function PexoShareLayer() {
  const { enabled, transient, state } = usePexo();
  const moment = useSyncExternalStore(onShare, pendingShare, () => null);
  const [open, setOpen] = useState<ShareMoment | null>(null);
  const waiting = !!moment && !transient && enabled && !state?.care?.active;
  const pick = usePexoLine(waiting ? (moment?.trigger ?? "share.prompt") : null, {}, moment ? `${moment.kind}:${moment.trigger ?? ""}` : "");
  return (
    <>
      {waiting && pick && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(124px+env(safe-area-inset-bottom))] z-[65] flex justify-center px-3 lg:inset-x-auto lg:bottom-6 lg:right-24 lg:justify-end lg:px-0" data-testid="pexo-share-offer">
          <div className="motion-toast pointer-events-auto w-full max-w-[400px]">
            <PexoBubble
              pick={pick}
              floating
              testId="pexo-share-bubble"
              actions={[
                { label: "Make a card", testId: "pexo-share-make", onClick: () => { setOpen(moment); clearShare(); } },
                { label: "Not now", onClick: () => clearShare() },
              ]}
              onDismiss={() => clearShare()}
            />
          </div>
        </div>
      )}
      {open && <ShareCardSheet moment={open} onClose={() => setOpen(null)} />}
    </>
  );
}
