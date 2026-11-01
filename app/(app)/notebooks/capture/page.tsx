"use client";

import { Camera, Images, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChapterPicker } from "@/components/notebooks/ChapterPicker";
import { CropModal } from "@/components/notebooks/CropModal";
import { useSubjects } from "@/components/study/useSubjects";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { getEntry, REASONS, REASON_LABEL, SOURCES, SOURCE_LABEL, type Reason, type Source } from "@/lib/api/notebooks";
import { getPlanDay } from "@/lib/api/plannerV2";
import { pickFiles } from "@/lib/notebooks/compress";
import { readLast, takePending, writeLast } from "@/lib/notebooks/pendingCapture";
import { saveCapturedBatch } from "@/lib/notebooks/saveCapture";

type Photo = { key: string; blob: Blob; url: string; reason: Reason | null };

const CHIP = "min-h-10 rounded-full border px-3 text-[13px] font-semibold transition-colors";
const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand";

function ReasonChips({ value, onChange, label }: { value: Reason | null; onChange: (r: Reason | null) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {REASONS.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={value === r} onClick={() => onChange(value === r ? null : r)} className={`${CHIP} ${value === r ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle text-body-text dark:text-ink"}`} data-testid={`capture-reason-${r}`}>
          {REASON_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

function CaptureScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { subjects, status } = useSubjects();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chapterId, setChapterId] = useState<string | null>(params.get("chapter"));
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [source, setSource] = useState<Source | null>(() => {
    const s = params.get("source");
    return s && (SOURCES as readonly string[]).includes(s) ? (s as Source) : null;
  });
  const [sourceRef, setSourceRef] = useState(params.get("ref") ?? "");
  const [cropping, setCropping] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const mockId = params.get("mock");
  const chosen = useRef(params.get("chapter") !== null);

  const add = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPhotos((cur) => [...cur, ...images.map((f) => ({ key: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, blob: f as Blob, url: URL.createObjectURL(f), reason: null }))]);
  }, []);

  // photos handed over from the screen that opened this one
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hand-over is read once, after mount
    add(takePending());
  }, [add]);

  // the chapter: the one in the link, else the chapter of today's task, else the last one used
  useEffect(() => {
    if (chosen.current) return;
    const last = readLast();
    if (last.chapterId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a one-time default read from this browser
      setChapterId(last.chapterId);
      setSubjectId(last.subjectId);
    }
    if (!source && last.source && (SOURCES as readonly string[]).includes(last.source)) setSource(last.source as Source);
    let alive = true;
    getPlanDay()
      .then((day) => {
        if (!alive || chosen.current) return;
        const task = day.data.tasks.find((t) => t.chapterId && t.status !== "done");
        if (task?.chapterId) setChapterId(task.chapterId);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are decided once
  }, []);

  // pasting a screenshot anywhere on this screen adds it
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = pickFiles(e.clipboardData?.files);
      if (files.length) {
        e.preventDefault();
        add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps -- revoke on leave only

  const croppingPhoto = useMemo(() => photos.find((p) => p.key === cropping) ?? null, [photos, cropping]);
  const allReason: Reason | null = photos.length > 1 && photos.every((p) => p.reason === photos[0]!.reason) ? photos[0]!.reason : null;

  async function save() {
    if (photos.length === 0 || saving) return;
    setSaving({ done: 0, total: photos.length });
    const { saved, failed } = await saveCapturedBatch(
      photos.map((p) => ({ blob: p.blob, reason: p.reason })),
      { chapterId, subjectId, source, sourceRef: sourceRef.trim() || null, mockId },
      (done, total) => setSaving({ done, total }),
    );
    writeLast({ chapterId, subjectId, source });
    if (failed.length > 0) {
      setPhotos((cur) => cur.filter((_, i) => failed.includes(i)));
      toast.show(`${saved.length} saved. ${failed.length} could not be saved: check your connection and tap Save again.`, 7000);
      setSaving(null);
      return;
    }
    try {
      const first = await getEntry(saved[0]!);
      router.push(`/notebooks/${first.notebookId}${saved.length === 1 ? `?page=${first.id}` : ""}`);
    } catch {
      router.push("/notebooks");
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 pb-28 sm:p-6 lg:mx-auto lg:w-full lg:max-w-[880px] lg:p-8" data-testid="capture-screen">
      <ProfileSubpageHeader title="Add mistakes" backHref="/notebooks" />

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="capture-camera-input" />
      <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => (add(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="capture-file-input" />

      <section className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4" aria-label="Where do these belong">
        {status === "loading" ? (
          <PageLoader label="Loading chapters…" />
        ) : (
          <ChapterPicker subjects={subjects} chapterId={chapterId} onChange={(c, s) => ((chosen.current = true), setChapterId(c), setSubjectId(s))} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Where it came from
            <select className={FIELD} value={source ?? ""} onChange={(e) => setSource((e.target.value || null) as Source | null)} data-testid="capture-source">
              <option value="">Not sure</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Reference
            <input className={FIELD} value={sourceRef} maxLength={200} onChange={(e) => setSourceRef(e.target.value)} placeholder="DPP 4 Q12" data-testid="capture-ref" />
          </label>
        </div>
        {chapterId === null && <p className="text-[12px] text-muted">No chapter yet: these go to “Unsorted mistakes” and you can move them later.</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <GhostButton className="flex-1 sm:flex-none" onClick={() => camera.current?.click()} data-testid="capture-camera">
          <Camera className="size-5" aria-hidden /> Take a photo
        </GhostButton>
        <GhostButton className="flex-1 sm:flex-none" onClick={() => picker.current?.click()} data-testid="capture-choose">
          <Images className="size-5" aria-hidden /> Choose photos
        </GhostButton>
      </div>

      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-[14px] text-muted" data-testid="capture-empty">
          Take a photo of the question you got wrong, or paste a screenshot with Ctrl+V. You can add several and tag them together.
        </p>
      ) : (
        <>
          {photos.length > 1 && (
            <section className="flex flex-col gap-2 rounded-2xl bg-tint-strong/60 p-3" aria-label="Tag all together" data-testid="batch-tagging">
              <p className="text-[13px] font-bold text-ink">Why did you miss all {photos.length}? Pick one for all, or tag each below.</p>
              <ReasonChips label="Reason for all" value={allReason} onChange={(r) => setPhotos((cur) => cur.map((p) => ({ ...p, reason: r })))} />
            </section>
          )}
          <ul className="flex flex-col gap-3" data-testid="capture-list">
            {photos.map((p, i) => (
              <li key={p.key} className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-3 sm:flex-row" data-testid="capture-item">
                <div className="relative sm:w-56 sm:shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
                  <img src={p.url} alt={`Question photo ${i + 1}`} className="max-h-64 w-full rounded-xl bg-tint-strong object-contain" />
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((cur) => cur.filter((x) => x.key !== p.key))} className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-[13px] font-bold text-ink">Why did you miss it?</p>
                  <ReasonChips label={`Reason for photo ${i + 1}`} value={p.reason} onChange={(r) => setPhotos((cur) => cur.map((x) => (x.key === p.key ? { ...x, reason: r } : x)))} />
                  <GhostButton className="mt-auto w-fit !min-h-10" onClick={() => setCropping(p.key)} data-testid="capture-crop">
                    Crop
                  </GhostButton>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {photos.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <CoralButton className="w-full lg:w-auto" disabled={saving !== null} onClick={() => void save()} data-testid="capture-save">
            {saving ? `Saving ${saving.done} of ${saving.total}…` : photos.length === 1 ? "Save mistake" : `Save ${photos.length} mistakes`}
          </CoralButton>
        </div>
      )}

      {croppingPhoto && (
        <CropModal
          file={croppingPhoto.blob}
          onCancel={() => setCropping(null)}
          onDone={(blob) => {
            setPhotos((cur) => cur.map((x) => (x.key === croppingPhoto.key ? (URL.revokeObjectURL(x.url), { ...x, blob, url: URL.createObjectURL(blob) }) : x)));
            setCropping(null);
          }}
        />
      )}
      <Toast state={toast} />
      <Link href="/notebooks" className="sr-only">
        Back to My Notebooks
      </Link>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<PageLoader label="Opening…" />}>
      <CaptureScreen />
    </Suspense>
  );
}
