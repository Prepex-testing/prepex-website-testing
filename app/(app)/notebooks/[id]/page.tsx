"use client";

import { Camera, ChevronLeft, Plus, Share2, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { EntryPage } from "@/components/notebooks/EntryPage";
import { StatsPanel } from "@/components/notebooks/StatsPanel";
import { StorageBanner } from "@/components/notebooks/StorageBanner";
import { StudyShell } from "@/components/study/StudyShell";
import { useSubjects } from "@/components/study/useSubjects";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { createEntry, createShare, deleteNotebook, fileUrl, listEntries, listNotebooks, REASON_LABEL, renameNotebook, type ListedEntry, type Notebook, type Usage } from "@/lib/api/notebooks";
import { dueLabel, titleOf } from "@/lib/notebooks/model";

type Tab = "mistakes" | "notes" | "stats";
const TABS: { key: Tab; label: string }[] = [
  { key: "mistakes", label: "Mistakes" },
  { key: "notes", label: "Notes" },
  { key: "stats", label: "Stats" },
];

function Row({ e, active, href }: { e: ListedEntry; active: boolean; href: string }) {
  const due = dueLabel(e);
  return (
    <Link href={href} replace aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${active ? "border-[1.5px] border-brand bg-tint-strong" : "border-brand/10 bg-surface hover:bg-tint-strong/50"}`} data-testid="page-row" data-entry-id={e.id}>
      {e.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a signed private file
        <img src={fileUrl(e.thumbUrl)} alt="" className="size-14 shrink-0 rounded-lg bg-tint-strong object-cover" loading="lazy" />
      ) : (
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-[11px] font-bold text-muted">
          {e.entryType === "note" ? "Note" : "Text"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[14px] font-bold text-ink">
          {e.starred && <Star className="size-3.5 shrink-0 fill-current" aria-label="Starred" />}
          <span className="truncate">{titleOf(e)}</span>
        </span>
        <span className="block truncate text-[12px] text-muted">{[e.reason ? REASON_LABEL[e.reason] : e.entryType === "mistake" ? "No reason yet" : null, due].filter(Boolean).join(" · ")}</span>
      </span>
    </Link>
  );
}

function NotebookScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const { lookup } = useSubjects();
  const [book, setBook] = useState<Notebook | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [items, setItems] = useState<ListedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mistakes");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [version, setVersion] = useState(0);
  const page = search.get("page");

  useEffect(() => {
    let alive = true;
    listNotebooks()
      .then((r) => {
        if (!alive) return;
        const found = r.notebooks.find((n) => n.id === id) ?? null;
        setBook(found);
        setUsage(r.usage);
        if (!found) setError("This notebook was not found.");
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : "Could not open this notebook."));
    return () => {
      alive = false;
    };
  }, [id, version]);

  const kind = tab === "notes" ? "note" : "mistake";
  useEffect(() => {
    if (tab === "stats") return;
    let alive = true;
    listEntries({ notebookId: id, entryType: kind, limit: 200 })
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [id, kind, tab, version]);

  // the page being read decides which tab shows (a link to a note opens the Notes tab)
  useEffect(() => {
    if (!page || !items) return;
     
    if (!items.some((e) => e.id === page)) listEntries({ notebookId: id, limit: 200 }).then((r) => { const hit = r.items.find((e) => e.id === page); if (hit) setTab(hit.entryType === "note" ? "notes" : "mistakes"); }).catch(() => undefined);
  }, [page, items, id]);

  // on a computer the first page opens by itself, so the right side is never blank
  useEffect(() => {
    if (page || !items || items.length === 0 || tab === "stats") return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) router.replace(`/notebooks/${id}?page=${items[0]!.id}`);
  }, [page, items, id, router, tab]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const href = (entryId: string) => `/notebooks/${id}?page=${entryId}`;
  const subjectName = book?.subjectId != null ? lookup.subjectName(book.subjectId) : null;
  const selected = useMemo(() => items?.find((e) => e.id === page) ?? null, [items, page]);

  async function addPage() {
    try {
      const e = await createEntry({ entryType: kind, notebookId: id, ...(book?.chapterId ? { chapterId: book.chapterId, subjectId: book.subjectId } : {}) });
      refresh();
      router.replace(href(e.id));
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not add a page.");
    }
  }

  async function shareNotebook() {
    try {
      const s = await createShare({ notebookId: id });
      const url = `${window.location.origin}${s.path}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.show("Link copied. Anyone with it can read this notebook, nothing else. You can turn it off in Settings.", 6000);
      } catch {
        toast.show(url, 9000);
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not make a link.");
    }
  }

  async function saveName() {
    if (renaming === null || !book) return;
    const next = renaming.trim();
    setRenaming(null);
    if (!next || next === book.title) return;
    try {
      await renameNotebook(id, next);
      refresh();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Could not rename it.");
    }
  }

  async function removeBook() {
    try {
      await deleteNotebook(id);
      router.push("/notebooks");
    } catch (err) {
      setConfirmDelete(false);
      toast.show(err instanceof ApiError ? err.message : "Could not delete it.");
    }
  }

  if (error) {
    return (
      <StudyShell current="/notebooks">
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">{error}</p>
        <Link href="/notebooks" className="text-[14px] font-semibold text-ink underline">Back to My Notebooks</Link>
      </StudyShell>
    );
  }
  if (!book) {
    return (
      <StudyShell current="/notebooks">
        <PageLoader label="Opening the notebook…" />
      </StudyShell>
    );
  }

  const readingOnPhone = page !== null && tab !== "stats";

  return (
    <StudyShell current="/notebooks" testId="notebook-view">
      <StorageBanner usage={usage} />

      <div className={`flex flex-col gap-3 ${readingOnPhone ? "hidden lg:flex" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/notebooks" aria-label="All notebooks" className="flex size-11 items-center justify-center rounded-lg text-ink hover:bg-tint-strong">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          {renaming !== null ? (
            <input autoFocus aria-label="Notebook name" className="h-11 min-w-0 flex-1 rounded-xl border border-input-border bg-surface px-3 text-[18px] font-extrabold text-ink" value={renaming} maxLength={80} onChange={(e) => setRenaming(e.target.value)} onBlur={() => void saveName()} onKeyDown={(e) => e.key === "Enter" && void saveName()} />
          ) : (
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[20px] font-extrabold text-ink" onDoubleClick={() => book.kind === "custom" && setRenaming(book.title)} data-testid="notebook-title">{book.title}</h2>
              <p className="truncate text-[12px] text-muted">{[subjectName, `${book.mistakes} mistakes`, book.notes > 0 ? `${book.notes} notes` : null, `${book.masteredPercent}% mastered`].filter(Boolean).join(" · ")}</p>
            </div>
          )}
          {book.due > 0 && (
            <GhostButton className="!min-h-11" onClick={() => router.push(`/notebooks/review?notebook=${id}`)} data-testid="review-notebook">
              Review {book.due} due
            </GhostButton>
          )}
          <GhostButton className="!min-h-11" onClick={() => router.push(`/notebooks/capture${book.chapterId ? `?chapter=${book.chapterId}` : ""}`)} data-testid="notebook-capture">
            <Camera className="size-5" aria-hidden /> Add photo
          </GhostButton>
          <button type="button" aria-label="Share this notebook" onClick={() => void shareNotebook()} className="flex size-11 items-center justify-center rounded-lg text-ink hover:bg-tint-strong" data-testid="share-notebook">
            <Share2 className="size-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Notebook sections" className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]">
          {TABS.map((t) => (
            <button key={t.key} type="button" aria-current={tab === t.key ? "page" : undefined} onClick={() => (setTab(t.key), router.replace(`/notebooks/${id}`))} className={`min-h-11 rounded-lg text-[14px] font-bold transition-colors ${tab === t.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`} data-testid={`tab-${t.key}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "stats" ? (
        <StatsPanel notebookId={id} lookup={lookup} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`flex flex-col gap-2 ${readingOnPhone ? "hidden lg:flex" : ""}`} aria-label="Pages" data-testid="page-list">
            <GhostButton className="w-full" onClick={() => void addPage()} data-testid="add-page">
              <Plus className="size-5" aria-hidden /> {tab === "notes" ? "New note" : "New mistake"}
            </GhostButton>
            {items === null ? (
              <PageLoader label="Loading pages…" />
            ) : items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border-subtle p-6 text-center text-[13px] text-muted" data-testid="list-empty">
                {tab === "notes" ? "No notes yet. Notes are for the things you want to remember: formulas, tricks, summaries." : "No mistakes here yet. Add a photo of a question you got wrong."}
              </p>
            ) : (
              <ul className="flex max-h-[calc(100vh-18rem)] flex-col gap-2 overflow-y-auto pr-1" data-testid="page-rows">
                {items.map((e) => (
                  <li key={e.id}>
                    <Row e={e} active={e.id === page} href={href(e.id)} />
                  </li>
                ))}
              </ul>
            )}
            {book.kind === "custom" && (
              <div className="mt-2 flex gap-2 text-[12px]">
                <button type="button" className="font-semibold text-muted underline" onClick={() => setRenaming(book.title)}>Rename</button>
                <button type="button" className="font-semibold text-muted underline" onClick={() => setConfirmDelete(true)}>Delete notebook</button>
              </div>
            )}
          </aside>

          <section className={page ? "" : "hidden lg:block"} aria-label="Page" data-testid="page-view">
            {page ? (
              <EntryPage
                entryId={page}
                notebookId={id}
                usage={usage}
                notify={(m) => toast.show(m, 5000)}
                onChanged={refresh}
                onDeleted={() => {
                  refresh();
                  router.replace(`/notebooks/${id}`);
                }}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-border-subtle p-10 text-center text-[14px] text-muted">{selected ? "" : "Pick a page on the left, or add a new one."}</p>
            )}
          </section>
        </div>
      )}

      <ConfirmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void removeBook()} title="Delete this notebook?" description="Its pages and photos go with it. This cannot be undone." confirmLabel="Delete" />
      <Toast state={toast} />
    </StudyShell>
  );
}

export default function NotebookPage() {
  return (
    <Suspense fallback={<PageLoader label="Opening…" />}>
      <NotebookScreen />
    </Suspense>
  );
}
