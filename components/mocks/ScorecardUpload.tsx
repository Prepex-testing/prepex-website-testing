"use client";

import { useRef, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import type { MockFormInitial } from "@/components/mocks/MockForm";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/http";
import { extractMockImage } from "@/lib/api/mock";
import { scorecardToForm } from "@/lib/logs/scorecard";

type Props = {
  subjects: SubjectChapters[];
  /** Called with what the photo read into; the page puts it in the form. */
  onExtracted: (initial: MockFormInitial) => void;
};

/** "Fill from a scorecard photo": the one thing the old mock analysis page did that the log could not. */
export function ScorecardUpload({ subjects, onExtracted }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await extractMockImage(file);
      onExtracted(scorecardToForm(data.extractedData, subjects));
      setMessage(data.parsedSuccessfully ? "Filled in from your scorecard. Check the numbers, then save." : "We could only read part of that scorecard. Fill in the rest.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Couldn't read that image. You can still enter the marks by hand.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-elevated-2 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="scorecard-upload">
      <p className="text-[13px] text-body-text dark:text-ink">Have a photo of the scorecard? Prepex reads the marks for you.</p>
      <input ref={input} type="file" accept="image/*" className="sr-only" data-testid="scorecard-file" aria-label="Scorecard photo" onChange={(e) => void pick(e.target.files?.[0])} />
      <GhostButton data-testid="scorecard-pick" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Reading…" : "Fill from a scorecard photo"}
      </GhostButton>
      {message && (
        <p role="status" className="text-[12px] text-muted sm:basis-full" data-testid="scorecard-message">
          {message}
        </p>
      )}
    </div>
  );
}
