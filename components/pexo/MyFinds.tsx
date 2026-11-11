"use client";

import Link from "next/link";
import { useState } from "react";
import { listPexoFinds, type PexoFind } from "@/lib/api/pexo";

const TYPE_LABEL: Record<PexoFind["type"], string> = { trick: "Trick", common_mistake: "Common mistake", one_liner: "One-liner" };

/** The finds the student saved after focus sessions. Loaded only when opened. */
export function MyFinds() {
  const [finds, setFinds] = useState<PexoFind[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && finds === null) {
      try {
        setFinds(await listPexoFinds());
        setError(false);
      } catch {
        setError(true);
      }
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="my-finds">
      <button type="button" onClick={() => void toggle()} aria-expanded={open} className="flex min-h-11 items-center justify-between rounded-xl border border-border-subtle px-3 text-left text-[13px] font-semibold text-ink hover:bg-tint-strong" data-testid="my-finds-toggle">
        My finds
        <span className="text-[12px] font-medium text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open && error && <p role="alert" className="text-[12px] font-medium text-danger">We couldn&apos;t load your finds. Please try again.</p>}
      {open && finds && finds.length === 0 && <p className="text-[12px] text-muted">Finds you save after a focus session show up here.</p>}
      {open && finds && finds.length > 0 && (
        <ul className="flex flex-col gap-2" data-testid="my-finds-list">
          {finds.map((f) => (
            <li key={f.id} className="rounded-xl bg-tint-strong px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {TYPE_LABEL[f.type]} · {f.chapter}
              </p>
              <p className="text-[13px] text-ink">{f.text}</p>
              <Link href={`/home/resource-library/chapter?${new URLSearchParams({ subject: f.subject, chapter: f.chapter })}`} className="text-[12px] font-semibold text-brand underline">
                Open in the library
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
