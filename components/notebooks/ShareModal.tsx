"use client";

import { useCallback, useEffect, useState } from "react";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/http";
import { createShare, listShares, revokeShare, type Share } from "@/lib/api/notebooks";

type Target = { notebookId: string } | { entryId: string };

const matches = (s: Share, t: Target) => ("notebookId" in t ? s.notebookId === t.notebookId : s.entryId === t.entryId);

/**
 * Share a notebook or one page as a read-only link. The link shows the pages and nothing about who made them, anyone with it can
 * read, and "Stop sharing" kills it at once.
 */
export function ShareModal({ open, onClose, target, what }: { open: boolean; onClose: () => void; target: Target; what: "notebook" | "page" }) {
  const [link, setLink] = useState<Share | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const all = await listShares();
      setLink(all.find((s) => matches(s, target)) ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the target is a fresh object each render; its ids are what matter
  }, ["notebookId" in target ? target.notebookId : target.entryId]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the current links whenever the dialog opens
      void load();
      setMessage(null);
    }
  }, [open, load]);

  const url = link ? `${typeof window === "undefined" ? "" : window.location.origin}${link.path}` : "";

  async function make() {
    try {
      const made = await createShare(target);
      setLink({ id: made.id, token: made.token, notebookId: "notebookId" in target ? target.notebookId : null, entryId: "entryId" in target ? target.entryId : null, path: made.path, createdAt: new Date().toISOString() });
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not make a link.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch {
      setMessage("Copy the link above.");
    }
  }

  async function stop() {
    if (!link) return;
    try {
      await revokeShare(link.id);
      setLink(null);
      setMessage("Sharing is off. The old link no longer opens.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not turn sharing off.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} ariaLabel={`Share this ${what}`}>
      <div className="flex flex-col gap-4" data-testid="share-modal">
        <h2 className="text-[20px] font-extrabold text-ink">Share this {what}</h2>
        <p className="text-[13px] text-muted">Anyone with the link can read it, without signing in. They cannot change anything, and the page does not show your name.</p>
        {state === "loading" && <p className="text-[13px] text-muted">Checking…</p>}
        {state === "error" && <p role="alert" className="text-[13px] font-semibold text-danger">Could not load your links.</p>}
        {state === "ready" && !link && (
          <CoralButton onClick={() => void make()} data-testid="share-make">
            Make a read-only link
          </CoralButton>
        )}
        {link && (
          <>
            <input readOnly aria-label="Share link" value={url} onFocus={(e) => e.currentTarget.select()} className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[13px] text-ink" data-testid="share-url" />
            <div className="flex gap-2">
              <CoralButton className="flex-1" onClick={() => void copy()} data-testid="share-copy">
                Copy link
              </CoralButton>
              <GhostButton className="flex-1" onClick={() => void stop()} data-testid="share-stop">
                Stop sharing
              </GhostButton>
            </div>
          </>
        )}
        {message && (
          <p role="status" className="text-[13px] font-semibold text-ink" data-testid="share-message">
            {message}
          </p>
        )}
        <GhostButton onClick={onClose}>Close</GhostButton>
      </div>
    </Modal>
  );
}
