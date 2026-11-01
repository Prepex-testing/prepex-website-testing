"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";

const ASPECTS = [
  { id: "orig", label: "Whole photo", value: 0 },
  { id: "wide", label: "Wide", value: 4 / 3 },
  { id: "tall", label: "Tall", value: 3 / 4 },
  { id: "square", label: "Square", value: 1 },
] as const;

async function cropTo(url: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image"));
    i.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  canvas.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.9));
}

/** Crop a photo to the question: pick a shape, drag and zoom, done. "Use the whole photo" keeps it as it is. */
export function CropModal({ file, onDone, onCancel }: { file: Blob; onDone: (cropped: Blob) => void; onCancel: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<number>(4 / 3);
  const [aspectId, setAspectId] = useState<(typeof ASPECTS)[number]["id"]>("orig");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- an object URL exists only once the browser makes it
    setUrl(u);
    const i = new Image();
    i.onload = () => setNatural(i.width / Math.max(1, i.height));
    i.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);
  const aspect = ASPECTS.find((a) => a.id === aspectId)!.value || natural;

  async function apply() {
    if (!url || !area) return onDone(file);
    setBusy(true);
    try {
      onDone(await cropTo(url, area));
    } catch {
      onDone(file);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop the photo" className="fixed inset-0 z-50 flex flex-col bg-black/90" data-testid="crop-modal">
      <div className="relative min-h-0 flex-1">{url && <Cropper image={url} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} objectFit="contain" />}</div>
      <div className="flex flex-col gap-3 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Shape">
          {ASPECTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={aspectId === a.id} onClick={() => setAspectId(a.id)} className={`min-h-10 rounded-full border px-3 text-[13px] font-semibold ${aspectId === a.id ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle text-ink"}`}>
              {a.label}
            </button>
          ))}
          <input type="range" aria-label="Zoom" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="ml-auto w-32" />
        </div>
        <div className="flex gap-2">
          <GhostButton className="flex-1" onClick={() => onDone(file)} data-testid="crop-skip">
            Use the whole photo
          </GhostButton>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <CoralButton className="flex-1" disabled={busy} onClick={() => void apply()} data-testid="crop-apply">
            Crop
          </CoralButton>
        </div>
      </div>
    </div>
  );
}
