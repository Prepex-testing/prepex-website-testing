"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BlockEditor, type AssetMap } from "@/components/notebooks/editor/BlockEditor";
import { Logo } from "@/components/ui/Logo";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getShared, REASON_LABEL, SOURCE_LABEL, type SharedPage, type SharedView } from "@/lib/api/notebooks";

function Page({ page }: { page: SharedPage }) {
  const assets: AssetMap = useMemo(() => Object.fromEntries(page.assets.map((a) => [a.id, { id: a.id, url: a.url, type: a.type as "image" | "pdf", width: a.width, height: a.height }])), [page.assets]);
  const facts = [page.reason ? REASON_LABEL[page.reason] : null, page.source ? SOURCE_LABEL[page.source] : null].filter(Boolean);
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-[#FFFEFA] p-4 shadow-sm sm:p-6 dark:bg-[#1B2030]" data-testid="shared-page">
      {(page.title || facts.length > 0) && (
        <header className="flex flex-col gap-1">
          {page.title && <h2 className="text-[20px] font-extrabold text-ink">{page.title}</h2>}
          {facts.length > 0 && <p className="text-[12px] font-semibold text-muted">{facts.join(" · ")}</p>}
        </header>
      )}
      <BlockEditor entryId="" blocks={page.blocks} onChange={() => undefined} assets={assets} readOnly onAssetsChanged={() => undefined} notify={() => undefined} />
      {page.fix && (
        <p className="rounded-xl bg-tint-strong/60 p-3 text-[14px] text-ink">
          <span className="font-bold">Fix: </span>
          {page.fix}
        </p>
      )}
    </article>
  );
}

/** A notebook or page its owner chose to share. Read-only, no sign-in, and nothing on it says whose it is. */
export default function SharedNotebookPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<SharedView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getShared(token)
      .then((v) => alive && setView(v))
      .catch((err) => alive && setError(err instanceof ApiError && err.status === 404 ? "This link is no longer shared." : "Could not open this link."));
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[820px] flex-col gap-5 p-4 sm:p-6" data-testid="shared-view">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" aria-label="Prepex" className="text-ink">
          <Logo size="compact" layout="horizontal" showTagline={false} />
        </Link>
        <span className="rounded-full border border-border-subtle px-3 py-1 text-[12px] font-semibold text-muted">Read only</span>
      </header>

      {error ? (
        <p role="alert" className="rounded-2xl bg-danger-bg p-6 text-center text-[15px] font-semibold text-danger" data-testid="shared-error">{error}</p>
      ) : !view ? (
        <PageLoader label="Opening…" />
      ) : (
        <>
          <h1 className="text-[24px] font-extrabold text-ink" data-testid="shared-title">{view.title}</h1>
          {view.pages.length === 0 ? <p className="text-[14px] text-muted">Nothing in here yet.</p> : view.pages.map((p) => <Page key={p.id} page={p} />)}
        </>
      )}

      <footer className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-tint-strong/60 p-6 text-center">
        <p className="text-[15px] font-bold text-ink">Keep your own mistakes in one place and get them back at the right time.</p>
        <Link href="/create-account" className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-brand-coral px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-95" data-testid="shared-cta">
          Make your own notebook on Prepex
        </Link>
      </footer>
    </main>
  );
}
