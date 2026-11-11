import type { PexoMood } from "@/lib/pexo/engine";
import { pexoEvent, pexoMark, pexoState } from "@/lib/pexo/store";

/**
 * D5: at a high point, Pexo offers a share card ("That's worth sharing. Want a card?"). At most one offer a day, never
 * in care mode, nothing when Pexo is off. The offer waits until the screen's reaction bubble has gone.
 */

export type ShareMoment = { kind: "level_up" | "all_tasks_done" | "last_rock" | "mastered" | "mock_up" | "streak"; title: string; detail?: string; mood: PexoMood };

let pending: ShareMoment | null = null;
const listeners = new Set<() => void>();

export function offerShare(moment: ShareMoment): boolean {
  const state = pexoState();
  if (!state?.enabled || state.care?.active) return false;
  if (!pexoMark("share.prompt")) return false;
  pending = moment;
  pexoEvent("share_prompt_shown", { kind: moment.kind });
  listeners.forEach((l) => l());
  return true;
}

export const pendingShare = (): ShareMoment | null => pending;
export function clearShare(): void {
  pending = null;
  listeners.forEach((l) => l());
}
export function onShare(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
