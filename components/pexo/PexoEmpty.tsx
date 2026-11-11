"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Pexo } from "@/components/pexo/Pexo";
import { usePexoLine } from "@/components/pexo/PexoBubble";

type Props = {
  /** An `empty.*` trigger from the library. */
  trigger: string;
  /** One button to the flow that fills this screen. */
  action?: { label: string; href: string };
  size?: 24 | 48 | 96;
  /** The plain empty state this replaces: shown as-is when Pexo is off or has no line. */
  children: ReactNode;
};

/**
 * An empty state with Pexo in it (calm) and Pexo's own line, plus one action. Built from spans so it can sit wherever
 * the old text sat, including inside a paragraph. With Pexo off the screen shows exactly what it showed before.
 */
export function PexoEmpty({ trigger, action, size = 48, children }: Props) {
  const pick = usePexoLine(trigger, {}, trigger);
  if (!pick) return <>{children}</>;
  return (
    <span className="inline-flex max-w-full flex-col items-center gap-2 text-center" data-testid="pexo-empty" data-line={pick.id}>
      <Pexo mood={pick.mood} size={size} />
      <span className="text-[14px] leading-snug text-body-text dark:text-ink">{pick.text}</span>
      {action && (
        <Link href={action.href} data-testid="pexo-empty-action" className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-border-strong px-4 text-[13px] font-medium text-ink hover:bg-surface-elevated-2">
          {action.label}
        </Link>
      )}
    </span>
  );
}
