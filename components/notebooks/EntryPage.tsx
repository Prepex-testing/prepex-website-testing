"use client";

import { Share2, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlockEditor, type AssetMap } from "@/components/notebooks/editor/BlockEditor";
import { useAutosave } from "@/components/notebooks/editor/useAutosave";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { GhostButton } from "@/components/ui/GhostButton";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { REASONS, REASON_LABEL, SOURCES, SOURCE_LABEL, createShare, deleteEntry, getEntry, reopenEntry, updateEntry, type Block, type EntryWithAssets, type Reason, type Source, type Usage } from "@/lib/api/notebooks";
import { dueLabel, SAVE_TEXT } from "@/lib/notebooks/model";

type Draft = {
  title: string;
  blocks: Block[];
  source: Source | null;
  sourceRef: string;
  reason: Reason | null;
  fix: string;
  starred: boolean;
  difficulty: "easy" | "medium" | "hard" | null;
  tags: string[];
  stuck: boolean;
};

const toDraft = (e: EntryWithAssets): Draft => ({ title: e.title, blocks: e.blocks, source: e.source, sourceRef: e.sourceRef ?? "", reason: e.reason, fix: e.fix ?? "", starred: e.starred, difficulty: e.difficulty, tags: e.tags, stuck: e.status === "stuck" });

const CHIP = "min-h-9 rounded-full border px-3 text-[12px] font-semibold transition-colors";
const FIELD = "h-11 w-full rounded-xl border border-input-border bg-surface px-3 text-[14px] text-ink outline-none focus:border-brand";

type Props = {
  entryId: string;
  usage?: Usage | null;
  onChanged?: () => void;
  onDeleted?: () => void;
  notify: (message: string) => void;
  /** The notebook this page sits in, for the share link. */
  notebookId?: string;
};

/**
 * One page of a notebook: the mistake header (where it came from, why it was missed, the fix) above a paper page the student writes
 * on. Everything saves itself a moment after the last change.
 */
export function EntryPage({ entryId, usage, onChanged, onDeleted, notify, notebookId }: Props) {
  const [entry, setEntry] = useState<EntryWithAssets | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [tagText, setTagText] = useState("");
  const fixRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLDivElement>(null);

  const save = useAutosave<Draft | null>(
    draft,
    async (d) => {
      if (!d || !entry) return;
      await updateEntry(entryId, {
        title: d.title,
        blocks: d.blocks,
        ...(entry.entryType === "mistake"
          ? { source: d.source, sourceRef: d.sourceRef || null, reason: d.reason, fix: d.fix || null, difficulty: d.difficulty, ...(d.stuck !== (entry.status === "stuck") ? { status: d.stuck ? ("stuck" as const) : ("reviewing" as const) } : {}) }
          : {}),
        starred: d.starred,
        tags: d.tags,
      });
      onChanged?.();
    },
    { enabled: entry !== null },
  );

  const { reset } = save;
  const load = useCallback(async () => {
    try {
      const e = await getEntry(entryId);
      setEntry(e);
      setDraft(toDraft(e));
      reset(toDraft(e));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open this page.");
    }
  }, [entryId, reset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening another page starts from a blank page while it loads
    setEntry(null);
    setDraft(null);
    setError(null);
    void load();
  }, [load]);

  const refreshAssets = useCallback(async () => {
    const e = await getEntry(entryId);
    setEntry((cur) => (cur ? { ...cur, assets: e.assets } : e));
  }, [entryId]);

  const assets: AssetMap = useMemo(() => Object.fromEntries((entry?.assets ?? []).map((a) => [a.id, a])), [entry]);

  if (error) return <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">{error}</p>;
  if (!entry || !draft) return <PageLoader label="Opening the page…" />;
  const mistake = entry.entryType === "mistake";
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  async function remove() {
    try {
      await deleteEntry(entryId);
      setConfirm(false);
      onDeleted?.();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not delete that.");
    }
  }

  async function share() {
    try {
      const s = await createShare({ entryId });
      const url = `${window.location.origin}${s.path}`;
      try {
        await navigator.clipboard.writeText(url);
        notify("Link copied. Anyone with it can read this page, nothing else.");
      } catch {
        notify(url);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Could not make a link.");
    }
  }

  return (
    <article className="flex flex-col gap-4" data-testid="entry-page" data-entry-type={entry.entryType}>
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <input aria-label="Title" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder={mistake ? "Name this mistake (optional)" : "Title"} className="min-w-0 flex-1 bg-transparent text-[22px] font-extrabold text-ink outline-none placeholder:text-muted" data-testid="entry-title" />
          <button type="button" aria-pressed={draft.starred} aria-label={draft.starred ? "Remove the star" : "Star this page"} onClick={() => set({ starred: !draft.starred })} data-testid="entry-star" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-tint-strong">
            <Star className={`size-5 ${draft.starred ? "fill-current" : ""}`} aria-hidden />
          </button>
          <button type="button" aria-label="Share this page" onClick={() => void share()} data-testid="entry-share" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-tint-strong">
            <Share2 className="size-5" aria-hidden />
          </button>
          <button type="button" aria-label="Delete this page" onClick={() => setConfirm(true)} data-testid="entry-delete" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger">
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>

        {mistake && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-3" data-testid="mistake-header">
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Where it came from" value={draft.source ?? ""} onChange={(e) => set({ source: (e.target.value || null) as Source | null })} className={`${FIELD} w-auto min-w-[10rem]`} data-testid="entry-source">
                <option value="">Source</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
              <input aria-label="Reference" value={draft.sourceRef} onChange={(e) => set({ sourceRef: e.target.value })} maxLength={200} placeholder="DPP 4 Q12, PYQ 2021…" className={`${FIELD} min-w-0 flex-1`} data-testid="entry-ref" />
              <select aria-label="Difficulty" value={draft.difficulty ?? ""} onChange={(e) => set({ difficulty: (e.target.value || null) as Draft["difficulty"] })} className={`${FIELD} w-auto`} data-testid="entry-difficulty">
                <option value="">Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div ref={reasonRef} role="radiogroup" aria-label="Why did you miss it?" className="flex flex-wrap gap-1.5" data-testid="entry-reasons">
              {REASONS.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={draft.reason === r} onClick={() => set({ reason: draft.reason === r ? null : r })} className={`${CHIP} ${draft.reason === r ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle text-body-text dark:text-ink"}`} data-testid={`reason-${r}`}>
                  {REASON_LABEL[r]}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
              What I will do differently
              <input ref={fixRef} value={draft.fix} maxLength={500} onChange={(e) => set({ fix: e.target.value })} placeholder="One line: the fix" className={FIELD} data-testid="entry-fix" />
            </label>

            <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
              <span data-testid="entry-due">{dueLabel(entry)}</span>
              {entry.reviewCount > 0 && <span>· re-solved {entry.reviewCount} {entry.reviewCount === 1 ? "time" : "times"}</span>}
              <label className="ml-auto flex items-center gap-1.5 font-semibold text-ink">
                <input type="checkbox" className="size-4" checked={draft.stuck} onChange={(e) => set({ stuck: e.target.checked })} data-testid="entry-stuck" /> Stuck: I need help with this
              </label>
              {entry.masteredAt && (
                <GhostButton className="!min-h-9" onClick={() => void reopenEntry(entryId).then(() => load())} data-testid="entry-reopen">
                  Reopen
                </GhostButton>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((t) => (
            <button key={t} type="button" onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })} aria-label={`Remove the tag ${t}`} className={`${CHIP} border-border-subtle text-ink`}>
              {t} ×
            </button>
          ))}
          <input
            aria-label="Add a tag"
            value={tagText}
            maxLength={30}
            placeholder="+ tag"
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const t = tagText.trim().toLowerCase();
                if (t && !draft.tags.includes(t) && draft.tags.length < 12) set({ tags: [...draft.tags, t] });
                setTagText("");
              }
            }}
            className="h-9 w-24 rounded-full border border-dashed border-border-subtle bg-transparent px-3 text-[12px] text-ink outline-none"
            data-testid="entry-tag-input"
          />
          <span role="status" className="ml-auto text-[12px] text-muted" data-testid="save-state" data-state={save.state}>
            {SAVE_TEXT[save.state]}
          </span>
        </div>
      </header>

      <div className="rounded-2xl border border-brand/10 bg-[#FFFEFA] p-4 shadow-sm sm:p-6 dark:bg-[#1B2030]" data-testid="paper">
        <BlockEditor
          entryId={entryId}
          blocks={draft.blocks}
          onChange={(blocks) => set({ blocks })}
          assets={assets}
          onAssetsChanged={refreshAssets}
          storageFull={usage?.full ?? false}
          notify={notify}
          onTag={() => document.querySelector<HTMLInputElement>('[data-testid="entry-tag-input"]')?.focus()}
          {...(mistake ? { onFix: () => fixRef.current?.focus() } : {})}
        />
      </div>

      {notebookId && (
        <Link href={`/notebooks/${notebookId}`} className="text-[13px] font-semibold text-ink underline md:hidden">
          Back to the notebook
        </Link>
      )}

      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={() => void remove()} title="Delete this page?" description="It goes from your notebook along with its photos and re-solve history." confirmLabel="Delete" />
    </article>
  );
}
