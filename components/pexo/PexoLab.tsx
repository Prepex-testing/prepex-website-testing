"use client";

import { Pexo } from "@/components/pexo/Pexo";
import { PexoBubble } from "@/components/pexo/PexoBubble";
import { MOOD_NAMES, PEXO_ACCESSORIES, PEXO_PROPS, PEXO_SIZES } from "@/components/pexo/moods";
import { selectLine } from "@/lib/pexo/engine";
import { PEXO_LIBRARY } from "@/lib/pexo/store";

/** The visual reference for Pexo (used by the Playwright screenshots): each mood at each size, each prop and accessory. */
export function PexoLab() {
  const sample = selectLine(PEXO_LIBRARY, "onb.hello.1", {}, { language: "en", shown: {} }, "2026-01-01")!;
  return (
    <main className="min-h-screen bg-surface-base p-4 sm:p-8" data-testid="pexo-lab">
      <h1 className="text-xl font-bold text-ink">Pexo</h1>
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Moods">
        {MOOD_NAMES.map((mood) => (
          <div key={mood} className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4" data-testid={`lab-mood-${mood}`}>
            <p className="text-[13px] font-bold capitalize text-ink">{mood}</p>
            <div className="flex flex-wrap items-end gap-3">
              {PEXO_SIZES.map((size) => (
                <Pexo key={size} mood={mood} size={size} />
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-border-subtle bg-surface p-4" aria-label="Props and accessories">
        {PEXO_PROPS.map((p) => (
          <figure key={p} className="flex flex-col items-center gap-1 text-[12px] text-muted">
            <Pexo mood="happy" size={96} prop={p} />
            {p}
          </figure>
        ))}
        {PEXO_ACCESSORIES.map((a) => (
          <figure key={a} className="flex flex-col items-center gap-1 text-[12px] text-muted">
            <Pexo mood="proud" size={96} accessory={a} />
            {a}
          </figure>
        ))}
      </section>
      <section className="mt-4 max-w-md" aria-label="Bubble">
        <PexoBubble pick={sample} actions={[{ label: "Start 15 minutes" }, { label: "Later" }]} onDismiss={() => undefined} />
      </section>
    </main>
  );
}
