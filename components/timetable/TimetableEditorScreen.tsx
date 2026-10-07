"use client";

import { useEffect, useState } from "react";
import { TimetableBuilder } from "@/components/timetable/TimetableBuilder";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getOnboardingProgress, getStudentChapters } from "@/lib/api/onboarding";
import {
  createTimetable,
  getCurrentTimetable,
  importTimetableFromOcr,
  saveTimetableBlocks,
  type Timetable,
} from "@/lib/api/timetable";
import { fromApiBlocks, toApiBlocks, type GridBlock } from "@/lib/timetable/grid";

type Props = {
  /** Called once the timetable is saved. */
  onSaved: () => void;
  saveLabel?: string;
  secondaryAction?: { label: string; onClick: () => void };
};

type Loaded = {
  timetable: Timetable | null;
  subjects: { id: number; name: string }[];
  canImport: boolean;
};

/**
 * Loads the student's timetable, subjects and OCR-upload availability, and
 * saves the grid back: POST /api/timetable the first time, then bulk-replace
 * blocks on that timetable. Used by the onboarding step and the in-app screen.
 */
export function TimetableEditorScreen({ onSaved, saveLabel, secondaryAction }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timetableId, setTimetableId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getCurrentTimetable(), getStudentChapters(), getOnboardingProgress()]).then(([tt, subj, prog]) => {
      if (cancelled) return;
      if (tt.status === "rejected") {
        setLoadError("We couldn't load your timetable. Please refresh.");
        return;
      }
      const timetable = tt.value.data.timetable;
      setTimetableId(timetable?.id ?? null);
      setLoaded({
        timetable,
        subjects: subj.status === "fulfilled" ? subj.value.data.map((s) => ({ id: s.subjectId, name: s.subjectName })) : [],
        canImport: prog.status === "fulfilled" ? Boolean(prog.value.data.profile?.hasScheduleUpload) : false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(blocks: GridBlock[]) {
    setSaving(true);
    setSaveError(null);
    try {
      const api = toApiBlocks(blocks);
      if (timetableId) {
        await saveTimetableBlocks(timetableId, api);
      } else {
        const { data } = await createTimetable({ source: "MANUAL", blocks: api });
        setTimetableId(data.id);
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save your timetable. Please try again.");
      setSaving(false);
    }
  }

  async function handleImport(): Promise<GridBlock[]> {
    try {
      const { data } = await importTimetableFromOcr();
      setTimetableId(data.id);
      return fromApiBlocks(data.blocks);
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Couldn't import that schedule.");
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
        {loadError}
      </p>
    );
  }
  if (!loaded) return <PageLoader label="Loading your timetable…" />;

  return (
    <TimetableBuilder
      initialBlocks={loaded.timetable ? fromApiBlocks(loaded.timetable.blocks) : []}
      subjects={loaded.subjects}
      saving={saving}
      saveLabel={saveLabel}
      error={saveError}
      onSave={handleSave}
      onImport={loaded.canImport ? handleImport : undefined}
      secondaryAction={secondaryAction}
    />
  );
}
