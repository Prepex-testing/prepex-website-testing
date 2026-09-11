"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Switch } from "@/components/ui/Switch";
import { XIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/http";
import {
  STUDY_WINDOW_LABEL,
  updateProfile,
  type ProfileOverview,
  type StudyWindow,
} from "@/lib/api/profile";

const WINDOWS = Object.keys(STUDY_WINDOW_LABEL) as StudyWindow[];
// Matches the 1–18 range core-service validates.
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

type StudyPreferencesModalProps = {
  open: boolean;
  onClose: () => void;
  preferences: NonNullable<ProfileOverview["studyPreferences"]> | null;
  onSaved: (overview: ProfileOverview) => void;
};

/**
 * Daily hours and study windows. Both feed the planner, so a change here
 * shapes the plans generated from the next day onward.
 */
export function StudyPreferencesModal({ open, onClose, preferences, onSaved }: StudyPreferencesModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Study preferences">
      {preferences ? (
        <PreferencesForm preferences={preferences} onClose={onClose} onSaved={onSaved} />
      ) : (
        <p className="py-6 text-center text-sm text-muted">
          Finish onboarding to set your study preferences.
        </p>
      )}
    </WhiteModal>
  );
}

function PreferencesForm({
  preferences,
  onClose,
  onSaved,
}: {
  preferences: NonNullable<ProfileOverview["studyPreferences"]>;
  onClose: () => void;
  onSaved: (overview: ProfileOverview) => void;
}) {
  const [weekdayHours, setWeekdayHours] = useState(preferences.weekdayHours);
  const [weekendHours, setWeekendHours] = useState(preferences.weekendHours);
  const [sameDailyTarget, setSameDailyTarget] = useState(preferences.sameDailyTarget);
  const [windows, setWindows] = useState<StudyWindow[]>(preferences.studyWindows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWindow = (window: StudyWindow) =>
    setWindows((current) =>
      current.includes(window) ? current.filter((w) => w !== window) : [...current, window],
    );

  const handleSave = async () => {
    if (windows.length === 0) {
      setError("Pick at least one study window.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data } = await updateProfile({
        weekdayHours,
        // With one target for every day, weekends follow the weekday figure.
        weekendHours: sameDailyTarget ? weekdayHours : weekendHours,
        sameDailyTarget,
        studyWindows: windows,
      });
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hourSelect = (value: number, onChange: (next: number) => void, label: string) => (
    <label className="flex flex-1 flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 rounded-xl border border-input-border bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand"
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h} {h === 1 ? "hr" : "hrs"}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink">Study Preferences</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Same target every day</p>
            <p className="text-xs text-muted">Use one number for weekdays and weekends.</p>
          </div>
          <Switch checked={sameDailyTarget} onChange={setSameDailyTarget} label="Same target every day" />
        </div>

        <div className="flex gap-3">
          {hourSelect(weekdayHours, setWeekdayHours, sameDailyTarget ? "Daily hours" : "Weekdays")}
          {!sameDailyTarget && hourSelect(weekendHours, setWeekendHours, "Weekends")}
        </div>

        <div>
          <p className="text-[13px] font-semibold text-ink">Study windows</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {WINDOWS.map((window) => {
              const active = windows.includes(window);
              return (
                <button
                  key={window}
                  type="button"
                  onClick={() => toggleWindow(window)}
                  aria-pressed={active}
                  className={`h-11 rounded-xl border text-[14px] font-semibold transition-colors ${
                    active
                      ? "border-brand bg-tint text-ink"
                      : "border-input-border bg-surface text-muted hover:bg-tint/40"
                  }`}
                >
                  {STUDY_WINDOW_LABEL[window]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
