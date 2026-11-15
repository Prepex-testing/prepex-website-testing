"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { ApiError } from "@/lib/api/http";
import { downloadDataExport, latestDataExport, requestDataExport, type DataExport } from "@/lib/api/dataRights";
import { getParentConnection, updateParentSettings, type ParentConnection } from "@/lib/api/parent";

const POLL_MS = 4000;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * Launch step 2 (A3): Settings → Your data. Download everything Prepex holds about you (built in the background, the
 * file can be downloaded for 24 hours), and switch the parent weekly report off.
 */
export function YourDataSettings() {
  const [exp, setExp] = useState<DataExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [parent, setParent] = useState<ParentConnection | null>(null);
  const [tick, setTick] = useState(0);

  // Load (and while a file is being prepared, re-check every few seconds).
  useEffect(() => {
    let alive = true;
    void latestDataExport()
      .catch(() => null)
      .then((latest) => {
        if (alive) setExp(latest);
      });
    return () => {
      alive = false;
    };
  }, [tick]);
  useEffect(() => {
    if (exp?.status !== "pending") return;
    const t = setTimeout(() => setTick((n) => n + 1), POLL_MS);
    return () => clearTimeout(t);
  }, [exp]);
  useEffect(() => {
    void getParentConnection()
      .then((r) => setParent(r.data.connection))
      .catch(() => undefined);
  }, []);

  const ready = exp?.status === "ready" && exp.expiresAt && new Date(exp.expiresAt) > new Date() ? exp : null;

  async function ask() {
    setBusy(true);
    setMessage(null);
    try {
      setExp(await requestDataExport());
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "That didn't work. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      await downloadDataExport(id);
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof ApiError ? err.message : "That download didn't work. Please try again." });
      if (err instanceof ApiError && err.status === 410) setExp(null);
    } finally {
      setBusy(false);
    }
  }

  async function setReports(on: boolean) {
    setMessage(null);
    try {
      const r = await updateParentSettings({ reportsEnabled: on });
      setParent(r.data.connection);
      setMessage({ kind: "ok", text: on ? "Your parent will get the weekly report again." : "The weekly report to your parent is off." });
    } catch {
      setMessage({ kind: "error", text: "That didn't save. Please try again." });
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-6" aria-label="Your data" data-testid="your-data">
      <div>
        <h2 className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">Your data</h2>
        <p className="text-[12px] leading-4 text-muted">See everything Prepex keeps about you, and choose who gets updates.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">Download my data</p>
          <p className="text-[12px] text-muted" data-testid="export-status">
            {ready
              ? `Your file is ready. You can download it until ${fmt(ready.expiresAt!)}.`
              : exp?.status === "pending"
                ? "Preparing your file. This usually takes under a minute."
                : exp?.status === "failed"
                  ? "We couldn't prepare your file. Please try again."
                  : "A file with your account, study logs, plans, notebooks and everything else we keep."}
          </p>
        </div>
        {ready ? (
          <button type="button" disabled={busy} onClick={() => void download(ready.id)} className="min-h-11 shrink-0 rounded-lg border border-ink/20 px-4 text-[14px] font-semibold text-ink disabled:opacity-50" data-testid="export-download">
            Download
          </button>
        ) : (
          <button type="button" disabled={busy || exp?.status === "pending"} onClick={() => void ask()} className="min-h-11 shrink-0 rounded-lg border border-ink/20 px-4 text-[14px] font-semibold text-ink disabled:opacity-50" data-testid="export-request">
            {exp?.status === "pending" ? "Preparing…" : "Prepare my file"}
          </button>
        )}
      </div>

      {parent && (
        <div className="flex items-center justify-between gap-4 border-t border-brand/10 pt-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Weekly report to my parent</p>
            <p className="text-[12px] text-muted">Sent on WhatsApp every Sunday. Turn it off any time.</p>
          </div>
          <Switch checked={parent.reportsEnabled} onChange={(v) => void setReports(v)} label="Weekly report to my parent" />
        </div>
      )}

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`text-[13px] ${message.kind === "error" ? "text-danger" : "text-muted"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
