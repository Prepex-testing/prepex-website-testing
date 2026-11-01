"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BlockEditor, type AssetMap } from "@/components/notebooks/editor/BlockEditor";
import { CoralButton } from "@/components/ui/CoralButton";
import { MathText } from "@/components/ui/MathText";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getEntry, listEntries, listNotebooks, REASON_LABEL, SOURCE_LABEL, type EntryWithAssets } from "@/lib/api/notebooks";
import { titleOf } from "@/lib/notebooks/model";
import { segments } from "@/lib/notebooks/print";

function PrintedPage({ entry, hideSolutions, n }: { entry: EntryWithAssets; hideSolutions: boolean; n: number }) {
  const assets: AssetMap = useMemo(() => Object.fromEntries(entry.assets.map((a) => [a.id, a])), [entry.assets]);
  const facts = [entry.source ? SOURCE_LABEL[entry.source] : null, entry.sourceRef, entry.reason ? REASON_LABEL[entry.reason] : null].filter(Boolean);
  return (
    <section className="break-inside-avoid-page flex flex-col gap-3 border-b border-brand/15 pb-8 print:break-after-page print:border-0" data-testid="print-page">
      <header>
        <p className="text-[12px] font-semibold text-muted">Mistake {n}</p>
        <h2 className="text-[20px] font-extrabold text-ink">{titleOf(entry)}</h2>
        {facts.length > 0 && <p className="text-[12px] text-muted">{facts.join(" · ")}</p>}
      </header>
      {segments(entry.blocks, hideSolutions).map((seg, i) =>
        seg.kind === "solution" ? (
          <div key={i} className="rounded-xl border border-dashed border-brand/30 p-3" data-testid="print-solution">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted">Solution</p>
            <MathText source={seg.blocks[0]!.text ?? ""} className="whitespace-pre-wrap text-[15px] text-ink" />
          </div>
        ) : (
          <BlockEditor key={i} entryId={entry.id} blocks={seg.blocks} onChange={() => undefined} assets={assets} readOnly onAssetsChanged={() => undefined} notify={() => undefined} />
        ),
      )}
      {!hideSolutions && entry.fix && (
        <p className="text-[14px] text-ink">
          <span className="font-bold">Fix: </span>
          {entry.fix}
        </p>
      )}
    </section>
  );
}

function PrintScreen() {
  const { id } = useParams<{ id: string }>();
  const only = useSearchParams().get("page");
  const [title, setTitle] = useState("Notebook");
  const [pages, setPages] = useState<EntryWithAssets[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const books = await listNotebooks();
      const nb = books.notebooks.find((b) => b.id === id);
      if (!nb) throw new ApiError(404, "This notebook was not found.");
      if (alive) setTitle(nb.title);
      const ids: string[] = [];
      for (let offset = 0; ; offset += 100) {
        const r = await listEntries({ notebookId: id, entryType: "mistake", limit: 100, offset });
        ids.push(...r.items.map((e) => e.id));
        if (offset + 100 >= r.total || r.items.length === 0) break;
      }
      const wanted = only ? ids.filter((x) => x === only) : ids;
      const full: EntryWithAssets[] = [];
      for (let i = 0; i < wanted.length; i += 5) full.push(...(await Promise.all(wanted.slice(i, i + 5).map((x) => getEntry(x)))));
      if (alive) setPages(full);
    })().catch((err) => alive && setError(err instanceof ApiError ? err.message : "Could not prepare the PDF."));
    return () => {
      alive = false;
    };
  }, [id, only]);

  return (
    <main className="mx-auto flex w-full max-w-[820px] flex-col gap-6 bg-white p-4 text-black sm:p-8 print:max-w-none print:p-0 dark:bg-[#0D0D2B]" data-testid="print-view">
      <div className="flex flex-wrap items-center gap-3 print:hidden" data-testid="print-controls">
        <Link href={`/notebooks/${id}`} className="text-[14px] font-semibold text-ink underline">Back</Link>
        <label className="mr-auto flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink">
          <input type="checkbox" className="size-5" checked={hide} onChange={(e) => setHide(e.target.checked)} data-testid="hide-solutions" /> Hide solutions
        </label>
        <CoralButton onClick={() => window.print()} disabled={!pages} data-testid="print-now">Save as PDF</CoralButton>
      </div>
      <h1 className="text-[26px] font-extrabold text-ink">{title}</h1>
      {error ? <p role="alert" className="text-danger">{error}</p> : !pages ? <PageLoader label="Preparing your pages…" /> : pages.length === 0 ? <p className="text-muted">No mistakes to print yet.</p> : pages.map((p, i) => <PrintedPage key={p.id} entry={p} hideSolutions={hide} n={i + 1} />)}
    </main>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<PageLoader label="Opening…" />}>
      <PrintScreen />
    </Suspense>
  );
}
