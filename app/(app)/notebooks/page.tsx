"use client";

import { Camera, ClipboardPaste, Plus, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StorageBanner } from "@/components/notebooks/StorageBanner";
import { StudyShell } from "@/components/study/StudyShell";
import { useSubjects } from "@/components/study/useSubjects";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { createNotebook, fileUrl, listEntries, listNotebooks, REASONS, REASON_LABEL, SOURCES, SOURCE_LABEL, STATUS_LABEL, type ListedEntry, type Notebook, type Reason, type Source, type Status, type Usage } from "@/lib/api/notebooks";
import { pickFiles } from "@/lib/notebooks/compress";
import { dueLabel, sortNotebooks, titleOf } from "@/lib/notebooks/model";
import { setPending } from "@/lib/notebooks/pendingCapture";
import { subjectColor } from "@/lib/study/subjects";

const SELECT = "h-11 min-w-0 rounded-xl border border-input-border bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand";

type Filters = { subjectId: number | null; source: Source | null; reason: Reason | null; status: Status | null; q: string };
const NO_FILTERS: Filters = { subjectId: null, source: null, reason: null, status: null, q: "" };
const entryFilterActive = (f: Filters) => f.source !== null || f.reason !== null || f.status !== null || f.q.trim().length > 0;

function Cover({ nb, subjectName }: { nb: Notebook; subjectName: string | null }) {
  const color = nb.subjectId !== null ? subjectColor(nb.subjectId) : "#8B5CF6";
  const total = nb.mistakes + nb.notes;
  return (
    <Link href={`/notebooks/${nb.id}`} className="group flex overflow-hidden rounded-2xl border border-brand/10 bg-surface shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" data-testid="notebook-cover" data-due={nb.due}>
      <span aria-hidden className="w-3 shrink-0" style={{ background: color }} />
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-extrabold text-ink">{nb.title}</span>
            <span className="block truncate text-[12px] text-muted">{subjectName ?? (nb.kind === "custom" ? "Notebook" : "Chapter")}</span>
          </span>
          {nb.due > 0 && (
            <span className="shrink-0 rounded-full border-[1.5px] border-brand bg-tint-strong px-2.5 py-1 text-[12px] font-bold text-ink" data-testid="due-badge">
              {nb.due} due
            </span>
          )}
        </span>
        <span className="text-[13px] text-body-text dark:text-ink">
          {nb.mistakes} {nb.mistakes === 1 ? "mistake" : "mistakes"}
          {nb.notes > 0 ? ` · ${nb.notes} ${nb.notes === 1 ? "note" : "notes"}` : ""}
        </span>
        {nb.mistakes > 0 && (
          <span className="flex items-center gap-2" aria-label={`${nb.masteredPercent}% mastered`}>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint-strong">
              <span className="block h-full rounded-full" style={{ width: `${nb.masteredPercent}%`, background: color }} />
            </span>
            <span className="text-[12px] font-semibold text-muted">{nb.masteredPercent}% mastered</span>
          </span>
        )}
        {total === 0 && <span className="text-[12px] text-muted">Empty. Add your first page.</span>}
        {nb.needSolution > 0 && <span className="text-[12px] text-muted">{nb.needSolution} {nb.needSolution === 1 ? "page needs" : "pages need"} a solution</span>}
      </span>
    </Link>
  );
}

export default function NotebooksPage() {
  const router = useRouter();
  const toast = useToast();
  const { subjects, lookup } = useSubjects();
  const [books, setBooks] = useState<Notebook[] | null>(null);
  const [dueTotal, setDueTotal] = useState(0);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [results, setResults] = useState<{ items: ListedEntry[]; total: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    listNotebooks()
      .then((r) => {
        if (!alive) return;
        setBooks(r.notebooks);
        setDueTotal(r.dueTotal);
        setUsage(r.usage);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Could not load your notebooks."));
    return () => {
      alive = false;
    };
  }, []);

  // filters on a page's own fields (source, reason, status, words) search the pages; a subject filter only narrows the shelf
  const searching = entryFilterActive(filters);
  useEffect(() => {
    if (!searching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the search results when the filters go
      setResults(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      listEntries({ ...(filters.subjectId !== null ? { subjectId: filters.subjectId } : {}), ...(filters.source ? { source: filters.source } : {}), ...(filters.reason ? { reason: filters.reason } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.q.trim() ? { q: filters.q.trim() } : {}), limit: 60 })
        .then((r) => alive && setResults(r))
        .catch(() => alive && setResults({ items: [], total: 0 }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [filters, searching]);

  const hand = useCallback(
    (files: File[]) => {
      const photos = files.filter((f) => f.type.startsWith("image/"));
      if (photos.length === 0) return;
      setPending(photos);
      router.push("/notebooks/capture");
    },
    [router],
  );

  // on a computer, paste a screenshot anywhere on the shelf
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const files = pickFiles(e.clipboardData?.files);
      if (files.length) {
        e.preventDefault();
        hand(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [hand]);

  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) files.push(new File([await item.getType(type)], "pasted.png", { type }));
      }
      if (files.length === 0) return toast.show("There is no picture on your clipboard. Copy a screenshot first.");
      hand(files);
    } catch {
      toast.show("Your browser blocked the clipboard. Press Ctrl+V (or Cmd+V) on this page instead.");
    }
  }

  async function makeNotebook() {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    try {
      const nb = await createNotebook(newTitle.trim(), newSubject);
      router.push(`/notebooks/${nb.id}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not make the notebook.");
      setBusy(false);
    }
  }

  const shelf = useMemo(() => {
    if (!books) return [];
    const list = filters.subjectId !== null ? books.filter((b) => b.subjectId === filters.subjectId) : books;
    return sortNotebooks(list);
  }, [books, filters.subjectId]);

  const name = (id: number | null) => (id === null ? null : lookup.subjectName(id));

  return (
    <StudyShell current="/notebooks" testId="notebooks-shelf">
      <StorageBanner usage={usage} />

      <section className="flex flex-col gap-3" aria-label="Add to your notebooks">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-[20px] font-extrabold text-ink">My Notebooks</h2>
          {dueTotal > 0 && (
            <Link href="/notebooks/review" className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-brand-coral px-5 py-3 text-[15px] font-semibold text-white transition hover:brightness-95" data-testid="due-for-review">
              Due for review: {dueTotal} →
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <GhostButton onClick={() => camera.current?.click()} data-testid="shelf-camera">
            <Camera className="size-5" aria-hidden /> Camera
          </GhostButton>
          <GhostButton className="max-sm:!hidden" onClick={() => void pasteFromClipboard()} data-testid="shelf-paste">
            <ClipboardPaste className="size-5" aria-hidden /> Paste
          </GhostButton>
          <GhostButton onClick={() => upload.current?.click()} data-testid="shelf-upload">
            <Upload className="size-5" aria-hidden /> Upload
          </GhostButton>
          <GhostButton onClick={() => setCreating(true)} data-testid="new-notebook">
            <Plus className="size-5" aria-hidden /> New notebook
          </GhostButton>
          <GhostButton className="sm:ml-auto" onClick={() => router.push("/notebooks/stats")} data-testid="shelf-stats">
            Stats
          </GhostButton>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (hand(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="shelf-camera-input" />
        <input ref={upload} type="file" accept="image/*" multiple hidden onChange={(e) => (hand(pickFiles(e.target.files)), (e.target.value = ""))} data-testid="shelf-upload-input" />
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_auto_auto_auto_auto]" aria-label="Find a page">
        <label className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <span className="sr-only">Search your notebooks</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className={`${SELECT} w-full pl-9`} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search notes, fixes, titles" data-testid="shelf-search" />
        </label>
        <select aria-label="Subject" className={SELECT} value={filters.subjectId ?? ""} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value ? Number(e.target.value) : null })} data-testid="filter-subject">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
        <select aria-label="Source" className={SELECT} value={filters.source ?? ""} onChange={(e) => setFilters({ ...filters, source: (e.target.value || null) as Source | null })} data-testid="filter-source">
          <option value="">Any source</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
        <select aria-label="Reason" className={SELECT} value={filters.reason ?? ""} onChange={(e) => setFilters({ ...filters, reason: (e.target.value || null) as Reason | null })} data-testid="filter-reason">
          <option value="">Any reason</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABEL[r]}
            </option>
          ))}
        </select>
        <select aria-label="Status" className={SELECT} value={filters.status ?? ""} onChange={(e) => setFilters({ ...filters, status: (e.target.value || null) as Status | null })} data-testid="filter-status">
          <option value="">Any status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">
          {error}
        </p>
      ) : searching ? (
        <section aria-label="Matching pages" data-testid="search-results">
          {results === null ? (
            <PageLoader label="Searching…" />
          ) : results.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-subtle p-8 text-center text-[14px] text-muted">No pages match. Try fewer filters.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.items.map((e) => (
                <li key={e.id}>
                  <Link href={`/notebooks/${e.notebookId}?page=${e.id}`} className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-3" data-testid="search-result">
                    {e.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a signed private file
                      <img src={fileUrl(e.thumbUrl)} alt="" className="size-14 shrink-0 rounded-lg bg-tint-strong object-cover" />
                    ) : (
                      <span aria-hidden className="size-14 shrink-0 rounded-lg bg-tint-strong" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">{titleOf(e)}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {[name(e.subjectId), e.reason ? REASON_LABEL[e.reason] : null, dueLabel(e) || STATUS_LABEL[e.status]].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : books === null ? (
        <PageLoader label="Opening your notebooks…" />
      ) : shelf.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-subtle p-10 text-center" data-testid="shelf-empty">
          <p className="text-[15px] font-semibold text-ink">Your notebooks start with your first mistake.</p>
          <p className="max-w-md text-[13px] text-muted">Photograph a question you got wrong, or finish a practice set. Each chapter gets its own notebook the first time a page lands in it.</p>
          <CoralButton onClick={() => camera.current?.click()}>Add a mistake</CoralButton>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="shelf-grid">
          {shelf.map((nb) => (
            <li key={nb.id}>
              <Cover nb={nb} subjectName={name(nb.subjectId)} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} ariaLabel="New notebook">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void makeNotebook();
          }}
        >
          <h2 className="text-[20px] font-extrabold text-ink">New notebook</h2>
          <p className="text-[13px] text-muted">Chapter notebooks make themselves. Use this for anything else: a formula sheet, a coaching module, notes for a topic.</p>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Name
            <input className={`${SELECT} h-12 w-full text-[15px]`} value={newTitle} maxLength={80} autoFocus onChange={(e) => setNewTitle(e.target.value)} placeholder="Organic formula sheet" data-testid="new-notebook-title" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Subject (optional)
            <select className={`${SELECT} h-12 w-full text-[15px]`} value={newSubject ?? ""} onChange={(e) => setNewSubject(e.target.value ? Number(e.target.value) : null)}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <GhostButton className="flex-1" onClick={() => setCreating(false)}>
              Cancel
            </GhostButton>
            <CoralButton type="submit" className="flex-1" disabled={!newTitle.trim() || busy} data-testid="new-notebook-save">
              Create
            </CoralButton>
          </div>
        </form>
      </Modal>
      <Toast state={toast} />
    </StudyShell>
  );
}
