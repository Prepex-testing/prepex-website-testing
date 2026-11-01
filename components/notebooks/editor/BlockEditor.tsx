"use client";

import { ArrowDown, ArrowUp, Camera, ChevronDown, ClipboardPaste, Eraser, Highlighter, Hand, Image as ImageIcon, Paperclip, PenLine, Redo2, Tag, Trash2, Type, Undo2, Wrench, EyeOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { INK_COLORS, INK_WIDTH, InkLayer, AUTO, type InkTool } from "@/components/notebooks/editor/InkLayer";
import { MathText } from "@/components/ui/MathText";
import { ApiError } from "@/lib/api/http";
import { fileUrl, uploadAsset, type AssetRef, type Block, type Stroke } from "@/lib/api/notebooks";
import { blank } from "@/lib/notebooks/model";
import { compressImage, pickFiles } from "@/lib/notebooks/compress";

export type AssetMap = Record<string, Pick<AssetRef, "id" | "url" | "type" | "width" | "height">>;

type Props = {
  entryId: string;
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  assets: AssetMap;
  /** Called after a file was stored, so the page can fetch the signed link for it. */
  onAssetsChanged: () => Promise<void> | void;
  readOnly?: boolean;
  /** Storage is full: photos are refused (text and ink still work). */
  storageFull?: boolean;
  onTag?: () => void;
  onFix?: () => void;
  notify: (message: string) => void;
};

const BTN = "flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-40";
const ICON = "size-4 shrink-0";
const AREA = "w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted";

function AutoArea({ value, onChange, placeholder, className = "", mono = false, testId }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; mono?: boolean; testId?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} placeholder={placeholder} data-testid={testId} onChange={(e) => onChange(e.target.value)} className={`${AREA} ${mono ? "font-mono text-[14px]" : ""} ${className}`} />;
}

/**
 * The page editor, shared by mistakes and notes. A page is a list of blocks: text, headings, checklists, photos, handwriting
 * (stored as strokes, never flattened), a hidden solution and formulas. Paste a screenshot anywhere, drop files, or use the camera.
 */
export function BlockEditor({ entryId, blocks, onChange, assets, onAssetsChanged, readOnly = false, storageFull = false, onTag, onFix, notify }: Props) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<InkTool>("hand");
  const [color, setColor] = useState<string>(AUTO);
  const [activeInk, setActiveInk] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const history = useRef<Record<string, { undo: Stroke[][]; redo: Stroke[][] }>>({});
  const latest = useRef(blocks);
  useEffect(() => {
    latest.current = blocks;
  }, [blocks]);

  const set = useCallback((next: Block[]) => onChange(next), [onChange]);
  const patch = (id: string, p: Partial<Block>) => set(latest.current.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id: string) => set(latest.current.filter((b) => b.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const list = [...latest.current];
    const i = list.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    set(list);
  };
  const append = (b: Block, after?: string) => {
    const list = [...latest.current];
    const i = after ? list.findIndex((x) => x.id === after) : -1;
    list.splice(i >= 0 ? i + 1 : list.length, 0, b);
    set(list);
  };

  // ---- files ----
  async function addFiles(files: File[]) {
    if (files.length === 0 || readOnly) return;
    setBusy(true);
    try {
      for (const f of files) {
        const isPdf = f.type === "application/pdf";
        if (!isPdf && storageFull) {
          notify("Storage limit reached. Delete some images to add more.");
          continue;
        }
        const body = isPdf ? f : await compressImage(f);
        const res = await uploadAsset(entryId, body, isPdf ? f.name : "photo.webp");
        append(blank(isPdf ? "file" : "image", { assetId: res.id }));
      }
      await onAssetsChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not add that file.");
    } finally {
      setBusy(false);
    }
  }

  async function pasteButton() {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) files.push(new File([await item.getType(type)], "pasted.png", { type }));
      }
      if (files.length > 0) return void (await addFiles(files));
      const text = (await navigator.clipboard.readText()).trim();
      if (text) append(blank("text", { text }));
      else notify("Nothing to paste. Copy a picture or some text first.");
    } catch {
      notify("Your browser did not allow pasting from the button. Press Ctrl+V (or Cmd+V) on the page instead.");
    }
  }

  function onPaste(e: ClipboardEvent) {
    if (readOnly) return;
    const files = pickFiles(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files);
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("textarea, input, [contenteditable=true]")) return;
    const text = e.clipboardData.getData("text/plain").trim();
    if (text) {
      e.preventDefault();
      append(blank("text", { text }));
    }
  }

  function onDrop(e: DragEvent) {
    const files = pickFiles(e.dataTransfer.files);
    if (files.length === 0 || readOnly) return;
    e.preventDefault();
    void addFiles(files);
  }

  // ---- ink ----
  const startInk = (assetId?: string, after?: string) => {
    const a = assetId ? assets[assetId] : undefined;
    const height = a?.width && a.height ? Math.max(120, Math.round((INK_WIDTH * a.height) / a.width)) : 320;
    const b = blank("ink", { height, ...(assetId ? { assetId } : {}) });
    append(b, after);
    setActiveInk(b.id);
    setTool("pen");
  };

  /** What each drawing can still undo and redo, kept in state so the buttons enable and disable as strokes come and go. */
  const [canHist, setCanHist] = useState<Record<string, { undo: boolean; redo: boolean }>>({});
  const syncHist = (id: string) => {
    const h = history.current[id];
    setCanHist((c) => ({ ...c, [id]: { undo: (h?.undo.length ?? 0) > 0, redo: (h?.redo.length ?? 0) > 0 } }));
  };
  function strokesChanged(block: Block, next: Stroke[]) {
    const h = (history.current[block.id] ??= { undo: [], redo: [] });
    h.undo.push(block.strokes ?? []);
    h.redo = [];
    syncHist(block.id);
    patch(block.id, { strokes: next });
  }
  function undo(block: Block) {
    const h = history.current[block.id];
    const prev = h?.undo.pop();
    if (!h || !prev) return;
    h.redo.push(block.strokes ?? []);
    syncHist(block.id);
    patch(block.id, { strokes: prev });
  }
  function redo(block: Block) {
    const h = history.current[block.id];
    const next = h?.redo.pop();
    if (!h || !next) return;
    h.undo.push(block.strokes ?? []);
    syncHist(block.id);
    patch(block.id, { strokes: next });
  }

  const hasBlocks = blocks.length > 0;

  return (
    <div ref={root} onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => !readOnly && e.preventDefault()} className="flex flex-col gap-3" data-testid="block-editor">
      {!readOnly && (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 rounded-xl border border-brand/10 bg-surface/95 p-1 backdrop-blur" role="toolbar" aria-label="Add to this page" data-testid="editor-toolbar">
          <button type="button" className={BTN} onClick={() => camera.current?.click()} disabled={busy || storageFull} data-testid="add-camera">
            <Camera className={ICON} aria-hidden /> Camera
          </button>
          <button type="button" className={BTN} onClick={() => gallery.current?.click()} disabled={busy} data-testid="add-image">
            <ImageIcon className={ICON} aria-hidden /> Image
          </button>
          <button type="button" className={BTN} onClick={() => void pasteButton()} disabled={busy} data-testid="add-paste">
            <ClipboardPaste className={ICON} aria-hidden /> Paste
          </button>
          <button type="button" className={BTN} onClick={() => append(blank("text"))} data-testid="add-text">
            <Type className={ICON} aria-hidden /> Text
          </button>
          <button type="button" className={BTN} onClick={() => startInk()} data-testid="add-pen">
            <PenLine className={ICON} aria-hidden /> Pen
          </button>
          <button type="button" className={BTN} onClick={() => append(blank("solution"))} data-testid="add-solution">
            <EyeOff className={ICON} aria-hidden /> Solution
          </button>
          {onTag && (
            <button type="button" className={BTN} onClick={onTag} data-testid="add-tag">
              <Tag className={ICON} aria-hidden /> Tag
            </button>
          )}
          {onFix && (
            <button type="button" className={BTN} onClick={onFix} data-testid="add-fix">
              <Wrench className={ICON} aria-hidden /> Fix
            </button>
          )}
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (void addFiles(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="camera-input" />
          <input ref={gallery} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => (void addFiles(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="gallery-input" />
        </div>
      )}
      {busy && (
        <p role="status" className="text-[12px] text-muted">
          Adding your file…
        </p>
      )}

      {!hasBlocks && !readOnly && <p className="rounded-xl border border-dashed border-brand/25 px-4 py-6 text-center text-[14px] text-muted">Start with a photo of the question, paste a screenshot, or write it down.</p>}

      {blocks.map((b, i) => {
        const asset = b.assetId ? assets[b.assetId] : undefined;
        const src = asset ? fileUrl(asset.url) : (b.url ?? null);
        return (
          <section key={b.id} data-testid={`block-${b.type}`} data-block-id={b.id} className="group relative rounded-lg focus-within:bg-tint-strong/40">
            {!readOnly && (
              <div className="absolute -top-3 right-0 z-10 flex items-center gap-0.5 rounded-lg border border-brand/10 bg-surface px-0.5 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                <button type="button" aria-label="Move up" className="flex size-8 items-center justify-center rounded text-muted hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(b.id, -1)}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label="Move down" className="flex size-8 items-center justify-center rounded text-muted hover:text-ink disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => move(b.id, 1)}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label="Delete this block" data-testid="delete-block" className="flex size-8 items-center justify-center rounded text-muted hover:text-danger" onClick={() => remove(b.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}

            {b.type === "text" &&
              (readOnly ? <MathText source={b.text ?? ""} className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink" /> : <AutoArea value={b.text ?? ""} onChange={(v) => patch(b.id, { text: v })} placeholder="Write here. Use $x^2$ for a formula." />)}

            {b.type === "heading" && (readOnly ? <h3 className="text-[19px] font-extrabold text-ink">{b.text}</h3> : <input value={b.text ?? ""} onChange={(e) => patch(b.id, { text: e.target.value })} placeholder="Heading" className="w-full bg-transparent text-[19px] font-extrabold text-ink outline-none placeholder:text-muted" />)}

            {b.type === "checklist" && (
              <label className="flex min-h-9 items-start gap-2.5">
                <input type="checkbox" className="mt-1.5 size-5" checked={b.checked ?? false} disabled={readOnly} onChange={(e) => patch(b.id, { checked: e.target.checked })} />
                {readOnly ? <span className={`text-[15px] ${b.checked ? "text-muted line-through" : "text-ink"}`}>{b.text}</span> : <AutoArea value={b.text ?? ""} onChange={(v) => patch(b.id, { text: v })} placeholder="To do" className={b.checked ? "text-muted line-through" : ""} />}
              </label>
            )}

            {b.type === "image" && (
              <figure className="flex flex-col gap-1.5">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a private, signed file link
                  <img src={src} alt="A photo on this page" className="max-h-[70vh] w-full cursor-zoom-in rounded-xl border border-brand/10 object-contain" onClick={() => setViewer(src)} data-testid="page-image" />
                ) : (
                  <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-label="Loading the photo" />
                )}
                {!readOnly && b.assetId && (
                  <figcaption className="flex flex-wrap gap-1">
                    <button type="button" className={BTN} onClick={() => startInk(b.assetId, b.id)} data-testid="draw-on-image">
                      <PenLine className={ICON} aria-hidden /> Draw on this
                    </button>
                  </figcaption>
                )}
              </figure>
            )}

            {b.type === "file" && (
              <a href={src ?? undefined} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl border border-brand/15 px-3 text-[14px] font-semibold text-ink hover:bg-tint-strong">
                <Paperclip className={ICON} aria-hidden /> PDF attachment
              </a>
            )}

            {b.type === "ink" && (
              <div className="flex flex-col gap-1.5" data-testid="ink-block">
                {!readOnly && activeInk === b.id && (
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-brand/10 bg-surface p-1" role="toolbar" aria-label="Drawing tools" data-testid="ink-tools">
                    {([
                      ["pen", PenLine, "Pen"],
                      ["highlighter", Highlighter, "Highlighter"],
                      ["eraser", Eraser, "Eraser"],
                      ["hand", Hand, "Scroll"],
                    ] as const).map(([t, Icon, label]) => (
                      <button key={t} type="button" aria-label={label} aria-pressed={tool === t} data-testid={`tool-${t}`} onClick={() => setTool(t)} className={`flex size-10 items-center justify-center rounded-lg ${tool === t ? "bg-tint-strong text-ink" : "text-muted hover:text-ink"}`}>
                        <Icon className="size-4" aria-hidden />
                      </button>
                    ))}
                    <span className="mx-1 h-6 w-px bg-brand/15" aria-hidden />
                    {INK_COLORS.map((c) => (
                      <button key={c} type="button" aria-label={c === AUTO ? "Ink colour: default" : `Ink colour ${c}`} aria-pressed={color === c} data-testid={`color-${c}`} onClick={() => setColor(c)} className={`flex size-8 items-center justify-center rounded-full ${color === c ? "ring-2 ring-ink" : ""}`}>
                        <span className="size-5 rounded-full border border-brand/20" style={{ background: c === AUTO ? "currentColor" : c }} />
                      </button>
                    ))}
                    <span className="mx-1 h-6 w-px bg-brand/15" aria-hidden />
                    <button type="button" aria-label="Undo" data-testid="ink-undo" disabled={!canHist[b.id]?.undo} onClick={() => undo(b)} className="flex size-10 items-center justify-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
                      <Undo2 className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label="Redo" data-testid="ink-redo" disabled={!canHist[b.id]?.redo} onClick={() => redo(b)} className="flex size-10 items-center justify-center rounded-lg text-muted hover:text-ink disabled:opacity-30">
                      <Redo2 className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label="Done drawing" className="ml-auto flex size-10 items-center justify-center rounded-lg text-muted hover:text-ink" onClick={() => (setActiveInk(null), setTool("hand"))}>
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
                <div onPointerDown={() => !readOnly && activeInk !== b.id && setActiveInk(b.id)} className="rounded-xl border border-brand/10">
                  <InkLayer strokes={b.strokes ?? []} height={b.height ?? 320} background={src} readOnly={readOnly || activeInk !== b.id} tool={activeInk === b.id ? tool : "hand"} color={color} onChange={(s) => strokesChanged(b, s)} testId="ink-surface" />
                </div>
              </div>
            )}

            {b.type === "solution" && (
              <div className="rounded-xl border border-dashed border-[var(--success)]/50 bg-[var(--success-bg)]/40 p-3" data-testid="solution-block">
                <button type="button" aria-expanded={open[b.id] ?? false} onClick={() => setOpen((o) => ({ ...o, [b.id]: !o[b.id] }))} className="flex min-h-9 w-full items-center justify-between text-left text-[13px] font-bold uppercase tracking-wide text-[var(--success)]" data-testid="solution-toggle">
                  Solution
                  <span className="flex items-center gap-1 text-[12px] normal-case tracking-normal">
                    {open[b.id] ? "Hide" : "Tap to show"} <ChevronDown className={`size-4 transition-transform ${open[b.id] ? "rotate-180" : ""}`} aria-hidden />
                  </span>
                </button>
                {open[b.id] && (readOnly ? <MathText source={b.text ?? ""} className="mt-2 whitespace-pre-wrap text-[15px] text-ink" /> : <AutoArea value={b.text ?? ""} onChange={(v) => patch(b.id, { text: v })} placeholder="Write the solution step by step." className="mt-2" testId="solution-text" />)}
              </div>
            )}

            {b.type === "formula" && (
              <div className="rounded-xl bg-tint-strong/60 p-3">
                {!readOnly && <AutoArea value={b.text ?? ""} onChange={(v) => patch(b.id, { text: v })} placeholder="Type a formula, for example $$F = ma$$" mono />}
                {(b.text ?? "").trim() !== "" && <MathText source={(b.text ?? "").includes("$") ? (b.text ?? "") : `$$${b.text}$$`} className="mt-1 text-[17px] text-ink" />}
              </div>
            )}
          </section>
        );
      })}

      {viewer && (
        <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setViewer(null)} data-testid="image-viewer">
          <button type="button" aria-label="Close" className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white" onClick={() => setViewer(null)}>
            <X className="size-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed file link */}
          <img src={viewer} alt="The photo, full screen" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
