import { useSyncExternalStore } from "react";
import type { PexoBatch, PexoClientEvent, PexoState } from "@/lib/api/pexo";
import { getXpSummary, onXpSummary } from "@/lib/api/xp";
import { quietAllows, selectLine, type PexoContext, type PexoLibrary, type PexoPick } from "@/lib/pexo/engine";
import library from "@/lib/pexo/library.json";

/**
 * Pexo on the client: one small store shared by every Pexo on the page.
 *
 *  - State (is Pexo on, language, quiet mode, what was shown) arrives with the XP summary the shell already fetches.
 *  - `pexoSay` picks a line through the engine and remembers it locally, so rotation works at once.
 *  - What was shown waits in a queue that the minute heartbeat carries to the server (`takePexoBatch`): a bubble never
 *    costs a request, and nothing here polls.
 *  - `pexoReact` shows one transient bubble (the layer in the app shell); a first-visit bubble beats any other.
 */

export const PEXO_LIBRARY = library as unknown as PexoLibrary;

export type PexoAction = { label: string; href?: string; onClick?: () => void; testId?: string };
export type PexoTransient = { key: number; pick: PexoPick; kind: "first_visit" | "reaction" | "care" | "celebration"; actions: PexoAction[]; sticky: boolean };

type Snapshot = { state: PexoState | null; transient: PexoTransient | null; version: number };

let state: PexoState | null = null;
let transient: PexoTransient | null = null;
let version = 0;
let snapshot: Snapshot = { state, transient, version };
let loading: Promise<PexoState | null> | null = null;
let nextKey = 1;

const listeners = new Set<() => void>();
const pending = { shown: new Set<string>(), firstVisits: new Set<string>(), marks: new Set<string>(), events: [] as NonNullable<PexoBatch["events"]> };

function publish() {
  version += 1;
  snapshot = { state, transient, version };
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const SERVER: Snapshot = { state: null, transient: null, version: 0 };

/** The live Pexo state. `state` is null until the first summary arrives, and `enabled` is false when Pexo is off. */
export function usePexo(): { enabled: boolean; state: PexoState | null; transient: PexoTransient | null } {
  const s = useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
  return { enabled: s.state?.enabled === true, state: s.state, transient: s.transient };
}

export const pexoState = (): PexoState | null => state;
export const pexoEnabled = (): boolean => state?.enabled === true;

/** Takes the state a summary carried. Lines shown on this device since then stay marked. */
let lastPrimed: PexoState | null = null;
export function primePexo(next: PexoState | null | undefined): void {
  if (!next || next === lastPrimed) return; // the request layer hands back the same remembered object
  lastPrimed = next;
  const today = next.today;
  const shown = { ...next.shown };
  for (const id of pending.shown) shown[id] = today;
  const marks = { ...next.marks };
  for (const m of pending.marks) marks[m] = today;
  state = { ...next, shown, marks, firstVisits: [...new Set([...next.firstVisits, ...pending.firstVisits])] };
  publish();
}

/** Loads Pexo with the XP summary (remembered and shared by the request layer). Safe to call from anywhere, any number of times. */
export function loadPexo(force = false): Promise<PexoState | null> {
  if (state && !force) return Promise.resolve(state);
  // never throws, even before the first call resolves
  loading ??= Promise.resolve()
    .then(() => getXpSummary())
    .then((s) => {
      primePexo(s?.pexo);
      return state;
    })
    .catch(() => state)
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** After a settings change: the server's answer is the new truth. */
export function setPexoState(next: PexoState): void {
  primePexo(next);
}

export type SayOptions = {
  /** Keep the line out of the rotation history (a title, a label). */
  silent?: boolean;
  /** Line ids that would not be true right now. */
  exclude?: readonly string[];
};

/**
 * The line Pexo says for a trigger, or null: Pexo is off, Quiet mode does not allow it, or no variant can be filled.
 * The pick is marked as shown here and queued for the server.
 */
export function pexoSay(trigger: string | readonly string[], context: PexoContext = {}, options: SayOptions = {}): PexoPick | null {
  if (!state?.enabled) return null;
  const pick = selectLine(PEXO_LIBRARY, trigger, context, { language: state.language, shown: state.shown }, state.today, options.exclude ?? []);
  if (!pick) return null;
  if (state.bubbles === "quiet" && !quietAllows(pick.trigger, pick.mood)) return null;
  if (!options.silent) markShown(pick.id);
  return pick;
}

function markShown(id: string): void {
  if (!state) return;
  pending.shown.add(id);
  if (state.shown[id] !== state.today) state = { ...state, shown: { ...state.shown, [id]: state.today } };
}

/** A one-off marker ("tour", "easter.long_idle"): true when it was not set today (or ever, with `once`), and it is now set. */
export function pexoMark(mark: string, once = false): boolean {
  if (!state?.enabled) return false;
  const at = state.marks[mark];
  if (at && (once || at === state.today)) return false;
  pending.marks.add(mark);
  state = { ...state, marks: { ...state.marks, [mark]: state.today } };
  return true;
}

export const pexoHasMark = (mark: string): boolean => Boolean(state?.marks[mark]);

/** True the first time a screen is opened (and records it); false ever after, on any device once the batch has landed. */
export function pexoFirstVisit(screen: string): boolean {
  if (!state?.enabled || state.firstVisits.includes(screen)) return false;
  pending.firstVisits.add(screen);
  state = { ...state, firstVisits: [...state.firstVisits, screen] };
  return true;
}

export function pexoEvent(name: PexoClientEvent, props?: Record<string, string | number | boolean | null>): void {
  if (!state?.enabled) return;
  pending.events.push(props ? { name, props } : { name });
}

/** Everything waiting to be recorded, emptied: the heartbeat sends it. Null when there is nothing. */
export function takePexoBatch(): PexoBatch | null {
  if (pending.shown.size + pending.firstVisits.size + pending.marks.size + pending.events.length === 0) return null;
  const batch: PexoBatch = {};
  if (pending.shown.size) batch.shown = [...pending.shown];
  if (pending.firstVisits.size) batch.firstVisits = [...pending.firstVisits];
  if (pending.marks.size) batch.marks = [...pending.marks];
  if (pending.events.length) batch.events = pending.events.splice(0);
  pending.shown.clear();
  pending.firstVisits.clear();
  pending.marks.clear();
  return batch;
}

/** A heartbeat that failed hands its batch back, so the next one carries it. */
export function returnPexoBatch(batch: PexoBatch): void {
  batch.shown?.forEach((id) => pending.shown.add(id));
  batch.firstVisits?.forEach((s) => pending.firstVisits.add(s));
  batch.marks?.forEach((m) => pending.marks.add(m));
  if (batch.events) pending.events.unshift(...batch.events);
}

// ---- the one transient bubble -------------------------------------------------------------------------------------

export type ReactOptions = { kind?: PexoTransient["kind"]; actions?: PexoAction[]; sticky?: boolean };

/**
 * Shows one short bubble in the app shell. At most one is visible: a first-visit bubble is never replaced by a
 * reaction, and a new reaction replaces an older one. Returns the pick, or null when nothing was said.
 */
export function pexoReact(trigger: string | readonly string[], context: PexoContext = {}, options: ReactOptions = {}): PexoPick | null {
  const kind = options.kind ?? "reaction";
  if (transient && (transient.kind === "first_visit" || transient.kind === "care") && kind === "reaction") return null;
  const pick = pexoSay(trigger, context);
  if (!pick) return null;
  transient = { key: nextKey++, pick, kind, actions: options.actions ?? [], sticky: options.sticky ?? (kind === "first_visit" || kind === "care") };
  publish();
  return pick;
}

export function dismissPexo(key?: number): void {
  if (!transient || (key !== undefined && transient.key !== key)) return;
  transient = null;
  publish();
}

/** Tests and sign-out. */
export function resetPexo(): void {
  state = null;
  lastPrimed = null;
  transient = null;
  loading = null;
  pending.shown.clear();
  pending.firstVisits.clear();
  pending.marks.clear();
  pending.events.length = 0;
  publish();
}

// every XP summary the app fetches (Home, the reward refresh after a tick) carries Pexo's latest state
if (typeof onXpSummary === "function") onXpSummary((summary) => primePexo(summary.pexo));
