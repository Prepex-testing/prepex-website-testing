"use client";

import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";

/** Which Rank GPS line fits: up or down by how much, a route move, ready, or how many study days are left to unlock it. */
export function gpsTrigger(input: { state: "locked" | "waiting" | "ready"; change: number | null; topMove?: string | null; daysLeft?: number | null }): { trigger: string | string[]; context: Record<string, string | number> } | null {
  if (input.state === "locked") return input.daysLeft && input.daysLeft > 0 ? { trigger: "gps.locked_progress", context: { n: input.daysLeft } } : null;
  if (input.state !== "ready") return null;
  const delta = input.change === null ? 0 : Math.round(Math.abs(input.change) * 10) / 10;
  if (input.change !== null && input.change >= 0.1) return { trigger: "gps.up", context: { delta } };
  if (input.change !== null && input.change <= -0.1) return { trigger: "gps.down", context: { delta } };
  return input.topMove ? { trigger: ["gps.move", "gps.ready"], context: { move: input.topMove } } : { trigger: "gps.ready", context: {} };
}

/** Pexo's one Rank GPS line, for the Home card and the report. Nothing when Pexo is off or nothing fits. */
export function GpsPexo({ input, size = 48, testId = "gps-pexo" }: { input: Parameters<typeof gpsTrigger>[0]; size?: 24 | 48; testId?: string }) {
  const pick = gpsTrigger(input);
  const line = usePexoLine(pick?.trigger ?? null, pick?.context ?? {}, `${input.state}:${input.change}:${input.topMove ?? ""}:${input.daysLeft ?? ""}`);
  if (!line) return null;
  return <PexoBubble pick={line} size={size} testId={testId} />;
}
