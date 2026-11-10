import { Lock } from "lucide-react";
import { COPY, PREMIUM_LABELS } from "@/lib/rankGps/labels";

/** A minimal locked card: what it is, and that it is part of Prepex Pro (coming soon). No price, no payment, no modal. */
export function ProLocked({ section, hint }: { section: keyof typeof PREMIUM_LABELS; hint?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border-strong p-4" data-testid={`pro-locked-${section}`}>
      <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-muted"><Lock size={16} /></span>
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-ink">{PREMIUM_LABELS[section]}</p>
        <p className="text-[13px] text-muted">{hint ? `${hint} ` : ""}{COPY.proLocked}</p>
      </div>
    </div>
  );
}
