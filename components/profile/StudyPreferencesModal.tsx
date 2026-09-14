"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Switch } from "@/components/ui/Switch";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { XIcon } from "@/components/ui/icons";
import { FIELD_LABEL, FOOTER_BUTTON, MODAL_CLOSE_ICON, MODAL_TITLE } from "@/components/profile/modalStyles";
import { ApiError } from "@/lib/api/http";
import {
  STUDY_WINDOW_LABEL,
  updateProfile,
  type ProfileOverview,
  type StudyWindow,
} from "@/lib/api/profile";

const WINDOWS = Object.keys(STUDY_WINDOW_LABEL) as StudyWindow[];
// Matches the 1–18 range core-service validates.
const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 1;
  return { value: String(h), label: `${h} ${h === 1 ? "hr" : "hrs"}` };
});

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
    <CustomSelect
      label={label}
      labelClassName={FIELD_LABEL}
      options={HOUR_OPTIONS}
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      placeholder="Select hours"
      // Two selects share the row, so step the text down on phones.
      valueTextClassName="text-[14px] sm:text-[16px]"
      className="flex-1"
    />
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className={MODAL_TITLE}>Study Preferences</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <XIcon className={MODAL_CLOSE_ICON} />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={FIELD_LABEL}>Same target every day</p>
            <p className="mt-0.5 text-xs text-muted">Use one number for weekdays and weekends.</p>
          </div>
          <Switch checked={sameDailyTarget} onChange={setSameDailyTarget} label="Same target every day" />
        </div>

        <div className="flex gap-3">
          {hourSelect(weekdayHours, setWeekdayHours, sameDailyTarget ? "Daily hours" : "Weekdays")}
          {!sameDailyTarget && hourSelect(weekendHours, setWeekendHours, "Weekends")}
        </div>

        <div>
          <p className={FIELD_LABEL}>Study windows</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
            {WINDOWS.map((window) => {
              const active = windows.includes(window);
              return (
                <button
                  key={window}
                  type="button"
                  onClick={() => toggleWindow(window)}
                  aria-pressed={active}
                  // Same height, radius and text size as the input fields.
                  className={`h-12.25 rounded-xl border px-2 text-[14px] font-semibold transition-colors sm:text-[16px] ${
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
        <Button variant="secondary" size="sm" className={FOOTER_BUTTON} onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" className={FOOTER_BUTTON} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
