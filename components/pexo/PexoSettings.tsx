"use client";

import { useEffect, useState } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { Segmented } from "@/components/settings/AppearanceSettings";
import { Switch } from "@/components/ui/Switch";
import { ApiError } from "@/lib/api/http";
import { updatePexoSettings, type PexoSettingsInput } from "@/lib/api/pexo";
import type { PexoLanguage } from "@/lib/pexo/engine";
import { loadPexo, setPexoState, usePexo } from "@/lib/pexo/store";

/** Settings → Pexo: the language Pexo speaks, how often Pexo speaks, and whether Pexo sends notifications. */
export function PexoSettings() {
  const { enabled, state } = usePexo();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPexo();
  }, []);

  if (!enabled || !state) return null;

  async function save(input: PexoSettingsInput) {
    setError(null);
    try {
      setPexoState(await updatePexoSettings(input));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save that. Please try again.");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm sm:p-6" aria-labelledby="pexo-settings-title" data-testid="pexo-settings">
      <div className="flex items-center gap-3">
        <Pexo size={48} mood="happy" />
        <div>
          <h2 id="pexo-settings-title" className="text-[15px] font-bold leading-6 text-ink sm:text-[16px]">
            Pexo
          </h2>
          <p className="text-[12px] leading-4 text-muted">Your study companion: the orange dot from the Prepex logo.</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink">Pexo&apos;s language</p>
        <Segmented<PexoLanguage>
          name="Pexo language"
          value={state.language}
          onChange={(language) => void save({ language })}
          options={[
            { id: "en", label: "English" },
            { id: "hi", label: "Hinglish" },
          ]}
        />
        <p className="text-[12px] text-muted">Only what Pexo says changes. The rest of Prepex stays in English.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink">Pexo bubbles</p>
        <Segmented<"normal" | "quiet">
          name="Pexo bubbles"
          value={state.bubbles}
          onChange={(bubbles) => void save({ bubbles })}
          options={[
            { id: "normal", label: "Normal" },
            { id: "quiet", label: "Quiet" },
          ]}
        />
        <p className="text-[12px] text-muted">Quiet keeps only first-visit tips, celebrations and care messages.</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">Pexo notifications</p>
          <p className="text-[12px] text-muted">At most 3 a day, never between 10:30 pm and 7 am.</p>
        </div>
        <Switch checked={state.notifications} onChange={(notifications) => void save({ notifications })} label="Pexo notifications" />
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
