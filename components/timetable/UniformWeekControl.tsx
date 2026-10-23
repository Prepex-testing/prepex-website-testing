"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DAY_LONG, defaultSourceDay, uniformWouldDiscard, type GridBlock } from "@/lib/timetable/grid";

type Props = {
  /** True = "my routine is the same every day": one day editor, applied to all seven. */
  uniform: boolean;
  blocks: GridBlock[];
  /** The day the student is looking at (phone tabs); the best guess for which day to copy when going uniform. */
  currentDay?: number;
  /** Called after the student confirms. `sourceDay` is the day to copy from when switching to uniform. */
  onConfirm: (uniform: boolean, sourceDay: number) => void;
};

/**
 * The switch at the top of the timetable step. Flipping it never silently changes the week: it always asks first,
 * and says what will happen to the days.
 */
export function UniformWeekControl({ uniform, blocks, currentDay, onConfirm }: Props) {
  const [asking, setAsking] = useState(false);
  const [sourceDay, setSourceDay] = useState(0);
  const labelId = useId();
  const selectId = useId();

  const goingUniform = !uniform;
  const discards = goingUniform && uniformWouldDiscard(blocks, sourceDay);

  function open() {
    setSourceDay(currentDay !== undefined && blocks.some((b) => b.dayOfWeek === currentDay) ? currentDay : defaultSourceDay(blocks));
    setAsking(true);
  }

  function confirm() {
    setAsking(false);
    onConfirm(goingUniform, sourceDay);
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={uniform}
        aria-labelledby={labelId}
        data-testid="uniform-toggle"
        onClick={open}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-brand/15 bg-surface px-4 py-3 text-left transition-colors hover:border-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] dark:border-white/15"
      >
        <span className="flex flex-col gap-0.5">
          <span id={labelId} className="text-[15px] font-bold text-ink">
            {uniform ? "My routine is the same every day" : "My routine changes day by day"}
          </span>
          <span className="text-[13px] font-medium text-muted">
            {uniform ? "Edit one day and it applies to all seven." : "Each day of the week is edited on its own."}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${uniform ? "border-transparent bg-toggle-on" : "border-brand/15 bg-brand/15"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow transition-transform ${uniform ? "translate-x-5 bg-surface" : "translate-x-0 bg-white"}`}
          />
        </span>
      </button>

      <Modal open={asking} onClose={() => setAsking(false)} ariaLabel={goingUniform ? "Use one routine for every day" : "Edit each day separately"}>
        <div data-testid="uniform-modal" className="flex flex-col gap-4">
          <h2 className="text-[20px] font-extrabold text-ink">{goingUniform ? "Use one routine for every day?" : "Edit each day separately?"}</h2>

          {goingUniform ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={selectId} className="text-[13px] font-bold text-body-text dark:text-ink">
                  Copy the plan from
                </label>
                <select
                  id={selectId}
                  value={sourceDay}
                  onChange={(event) => setSourceDay(Number(event.target.value))}
                  className="min-h-11 rounded-lg border border-brand/20 dark:border-white/20 bg-surface px-3 text-[15px] font-semibold text-ink"
                >
                  {DAY_LONG.map((name, day) => (
                    <option key={name} value={day}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[14px] font-medium text-body-text dark:text-ink">
                Switching will copy {DAY_LONG[sourceDay]}&apos;s plan to all 7 days.
                {discards ? " What you have on the other days will be replaced." : ""} Continue?
              </p>
            </>
          ) : (
            <p className="text-[14px] font-medium text-body-text dark:text-ink">
              Switching will expand to 7 editable days. Each day starts as a copy of your current plan, and nothing is lost. Continue?
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="min-h-12 flex-1 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="uniform-confirm"
              onClick={confirm}
              className="min-h-12 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F]"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
