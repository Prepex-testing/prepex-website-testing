"use client";

import { Modal } from "@/components/ui/Modal";
import { GhostButton } from "@/components/ui/GhostButton";
import { COPY, HOW_STEPS } from "@/lib/rankGps/labels";

export function HowSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={COPY.how}>
      <div className="flex flex-col gap-4" data-testid="how-sheet">
        <h2 className="text-lg font-bold text-ink">{COPY.how}</h2>
        <ol className="flex flex-col gap-3">
          {HOW_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-tint-strong text-[12px] font-bold text-ink">{i + 1}</span>
              <div>
                <p className="text-[14px] font-bold text-ink">{s.title}</p>
                <p className="text-[13px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[12px] text-muted">Rank GPS is an estimate built from your own data. It will move as you log more.</p>
        <GhostButton onClick={onClose} className="self-end">Close</GhostButton>
      </div>
    </Modal>
  );
}
