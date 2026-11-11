"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Pexo, type PexoTap } from "@/components/pexo/Pexo";
import type { PexoProp, PexoSize } from "@/components/pexo/moods";
import { GHOST_CLASSES } from "@/components/ui/GhostButton";
import type { PexoContext, PexoPick } from "@/lib/pexo/engine";
import { pexoSay, usePexo, type PexoAction } from "@/lib/pexo/store";

type Props = {
  pick: PexoPick;
  /** One or two buttons under the line (deep links or actions). */
  actions?: PexoAction[];
  onDismiss?: () => void;
  size?: PexoSize;
  prop?: PexoProp | PexoProp[] | false;
  onTap?: (kind: PexoTap) => void;
  /** Card look for a transient bubble that floats over the page; plain for a bubble that sits in the page. */
  floating?: boolean;
  className?: string;
  testId?: string;
};

const ACTION = `${GHOST_CLASSES} !min-h-11 !px-3.5 !py-2 !text-[13px]`;

/**
 * Pexo and what Pexo says: the line, up to two actions, and a dismiss. Announced politely to screen readers and never
 * modal. The text is always a line from the library, already filled.
 */
export function PexoBubble({ pick, actions = [], onDismiss, size = 48, prop, onTap, floating = false, className = "", testId = "pexo-bubble" }: Props) {
  const { state } = usePexo();
  const accessory = state?.accessories[state.accessories.length - 1] ?? null;
  return (
    <div className={`flex items-start gap-2.5 ${className}`} data-testid={testId} data-line={pick.id} data-mood={pick.mood}>
      <Pexo mood={pick.mood} size={size} speaking accessory={accessory} {...(prop !== undefined ? { prop } : {})} {...(onTap ? { onTap } : {})} />
      <div
        role="status"
        aria-live="polite"
        className={`relative min-w-0 flex-1 rounded-2xl rounded-tl-md border border-border-subtle px-3.5 py-2.5 ${floating ? "bg-surface-elevated-2 shadow-lg" : "bg-surface-elevated"}`}
      >
        <p className={`text-[14px] leading-snug text-ink ${onDismiss ? "pr-7" : ""}`} data-testid="pexo-text">
          {pick.text}
        </p>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.slice(0, 2).map((a) =>
              a.href ? (
                <Link key={a.label} href={a.href} className={ACTION} data-testid={a.testId ?? "pexo-action"} {...(a.onClick ? { onClick: a.onClick } : {})}>
                  {a.label}
                </Link>
              ) : (
                <button key={a.label} type="button" className={ACTION} data-testid={a.testId ?? "pexo-action"} onClick={a.onClick}>
                  {a.label}
                </button>
              ),
            )}
          </div>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" data-testid="pexo-dismiss" className="absolute right-0 top-0 flex size-11 items-start justify-end p-2.5 text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Picks a line once for a given key (a trigger and the facts it needs) and keeps it while the key is the same, so a
 * re-render never re-rolls the line or records it twice. Null while Pexo is off, quiet, or has nothing it can say.
 */
export function usePexoLine(trigger: string | readonly string[] | null, context: PexoContext = {}, key = "", exclude: readonly string[] = []): PexoPick | null {
  const { enabled, state } = usePexo();
  const [pick, setPick] = useState<PexoPick | null>(null);
  const triggerKey = trigger === null ? "" : typeof trigger === "string" ? trigger : trigger.join("|");
  const language = state?.language;
  const bubbles = state?.bubbles;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the line is chosen once per key, after Pexo's state is known
    setPick(enabled && trigger !== null ? pexoSay(trigger, context, { exclude }) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the context
  }, [enabled, triggerKey, key, language, bubbles]);
  return pick;
}
