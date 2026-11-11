/**
 * Pexo's line engine. Pure and dependency-free: the SAME file runs in the website (lib/pexo/engine.ts) and here, so a
 * line picked for a bubble and a line picked for a notification follow one set of rules. Keep the two copies identical.
 *
 * Rules (Pexo guide, sections 5 to 7):
 *  - Pexo only ever says a line from the library. Nothing is invented or rewritten here.
 *  - A line with a {placeholder} the context cannot fill is never shown: another variant (or a fallback trigger) is
 *    picked instead, or nothing is said at all.
 *  - Rotation: the least recently shown variant wins, so a line is not repeated within 7 days while another fits.
 */

export type PexoMood = 'calm' | 'celebrating' | 'cheering' | 'curious' | 'focused' | 'happy' | 'proud' | 'sleepy' | 'thinking' | 'waving'
export type PexoLanguage = 'en' | 'hi'

export interface PexoLine {
  id: string
  trigger: string
  mood: PexoMood
  en: string
  hi: string
}

export interface PexoLibrary {
  version: number
  lines: readonly PexoLine[]
}

/** Values a line may be filled with. Null, undefined, an empty string and a non-finite number all count as "missing". */
export type PexoContext = Readonly<Record<string, string | number | null | undefined>>

export interface PexoUser {
  language: PexoLanguage
  /** Line id -> the IST date (YYYY-MM-DD) it was last shown to this student. */
  shown: Readonly<Record<string, string>>
}

export interface PexoPick {
  id: string
  trigger: string
  mood: PexoMood
  text: string
}

export const ROTATION_DAYS = 7

const PLACEHOLDER = /\{(\w+)\}/g

export function placeholdersOf(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]!)
}

const present = (v: string | number | null | undefined): boolean => (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' && v.trim().length > 0)

/** True when every placeholder of the line (in this language) has a real value in the context. */
export function canFill(line: PexoLine, context: PexoContext, language: PexoLanguage): boolean {
  return placeholdersOf(line[language]).every((key) => present(context[key]))
}

export function fillLine(text: string, context: PexoContext): string {
  return text.replace(PLACEHOLDER, (_whole, key: string) => String(context[key]))
}

const dayNumber = (label: string): number => Math.floor(Date.parse(`${label}T00:00:00.000Z`) / 86_400_000)

/** Whole days from `earlier` to `later` (both YYYY-MM-DD); a missing date counts as "never", i.e. Infinity. */
export function daysSince(earlier: string | undefined, later: string): number {
  if (!earlier) return Number.POSITIVE_INFINITY
  const d = dayNumber(later) - dayNumber(earlier)
  return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY
}

/** A small stable hash, so "which of the never-shown variants first" differs by day and trigger but is repeatable. */
export function stableHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Picks the line to say for a trigger (or the first of several triggers that has a sayable line).
 * Returns null when no variant can be filled: the caller then shows nothing.
 * `exclude` lists line ids that would not be TRUE right now (a line with no placeholder can still make a claim, such as
 * "You're ahead of yesterday"): the caller knows the facts, so the caller rules those lines out.
 */
export function selectLine(library: PexoLibrary, trigger: string | readonly string[], context: PexoContext, user: PexoUser, today: string, exclude: readonly string[] = []): PexoPick | null {
  for (const t of typeof trigger === 'string' ? [trigger] : trigger) {
    const fits = library.lines.filter((l) => l.trigger === t && !exclude.includes(l.id) && canFill(l, context, user.language))
    if (fits.length === 0) continue
    // least recently shown first (never shown = oldest); a line shown within the rotation window only wins when every
    // other variant was shown even more recently or none exists
    const age = (l: PexoLine): number => daysSince(user.shown[l.id], today)
    const oldest = Math.max(...fits.map(age))
    const pool = fits.filter((l) => age(l) === oldest)
    const line = pool[stableHash(`${today}|${t}`) % pool.length]!
    const text = fillLine(line[user.language], context)
    if (/\{\w+\}/.test(text)) continue // never show an unfilled placeholder
    return { id: line.id, trigger: line.trigger, mood: line.mood, text }
  }
  return null
}

/** True when the same line would be a repeat inside the rotation window (used by the notification rules). */
export function shownRecently(user: PexoUser, lineId: string, today: string): boolean {
  return daysSince(user.shown[lineId], today) < ROTATION_DAYS
}

/**
 * Quiet mode ("Pexo bubbles: Quiet") keeps only first-visit bubbles, celebrations and care. Onboarding, the tour and
 * what the student asks for themselves (tapping Pexo, "What should I do now?") are never suppressed.
 */
export function quietAllows(trigger: string, mood: PexoMood): boolean {
  const family = trigger.split('.')[0]!
  return mood === 'celebrating' || ['first_visit', 'care', 'onb', 'tour', 'ask', 'playbook', 'easter'].includes(family)
}

export function lineById(library: PexoLibrary, id: string): PexoLine | undefined {
  return library.lines.find((l) => l.id === id)
}

export function hasTrigger(library: PexoLibrary, trigger: string): boolean {
  return library.lines.some((l) => l.trigger === trigger)
}
