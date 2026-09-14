"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { Switch } from "@/components/ui/Switch";
import { XIcon } from "@/components/ui/icons";
import { FIELD_LABEL, FOOTER_BUTTON, MODAL_CLOSE_ICON, MODAL_TITLE } from "@/components/profile/modalStyles";
import { ApiError } from "@/lib/api/http";
import { getJournalSettings, updateJournalSettings, type JournalSettings } from "@/lib/api/journal";

type WinJournalSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the saved settings, so the profile row's summary can update. */
  onSaved?: (settings: JournalSettings) => void;
};

/** PRD 7.7 — every default is ON. */
const DEFAULT_SETTINGS: JournalSettings = {
  winJournalEnabled: true,
  winJournalNotify: true,
  winJournalInParentReport: true,
};

const ROWS: { key: keyof JournalSettings; title: string; description: string }[] = [
  {
    key: "winJournalEnabled",
    title: "Generate Win Journal",
    description: "Build your weekly card every Friday.",
  },
  {
    key: "winJournalNotify",
    title: "Notification on Friday",
    description: "Alert me when my card is ready.",
  },
  {
    key: "winJournalInParentReport",
    title: "Include in parent reports",
    description: "Show my week's top win in the Sunday parent report.",
  },
];

/** PRD 7.7 — Win Journal settings & opt-out. */
export function WinJournalSettingsModal({ open, onClose, onSaved }: WinJournalSettingsModalProps) {
  return (
    <WhiteModal open={open} onClose={onClose} ariaLabel="Win Journal settings">
      {/* Remounted per open, so the form always starts from the saved values. */}
      {open && <SettingsForm onClose={onClose} onSaved={onSaved} />}
    </WhiteModal>
  );
}

function SettingsForm({ onClose, onSaved }: Omit<WinJournalSettingsModalProps, "open">) {
  const [settings, setSettings] = useState<JournalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJournalSettings()
      .then(({ data }) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your Win Journal settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { data } = await updateJournalSettings(settings);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // With generation off there's no card to announce or share, so the other
  // two switches have nothing to act on.
  const generationOff = !settings.winJournalEnabled;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className={MODAL_TITLE}>Win Journal Settings</h2>
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
        {ROWS.map((row) => {
          const dependent = row.key !== "winJournalEnabled";
          const disabled = loading || (dependent && generationOff);
          return (
            <div
              key={row.key}
              className={`flex items-center justify-between gap-4 ${disabled ? "pointer-events-none opacity-50" : ""}`}
              aria-disabled={disabled}
            >
              <div>
                <p className={FIELD_LABEL}>{row.title}</p>
                <p className="mt-0.5 text-xs text-muted">{row.description}</p>
              </div>
              <Switch
                checked={settings[row.key]}
                onChange={(checked) => setSettings((current) => ({ ...current, [row.key]: checked }))}
                label={row.title}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" size="sm" className={FOOTER_BUTTON} onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          className={FOOTER_BUTTON}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
