import type { Fix } from "@/lib/api/diagnosis";

/** Presentation helpers for the AI diagnoses. */

export type Section = { title: string; body: string };

const HEADING_LINE = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*([^*#:\n]{4,60}?)\s*(?:\*\*)?\s*:?\s*$/;

function titleCase(shout: string): string {
  const lower = shout.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** A section heading is a line written in capitals ("WHAT IS WORKING"), however it is decorated (##, bold, trailing colon). */
function headingOf(line: string): string | null {
  const m = HEADING_LINE.exec(line);
  const text = m?.[1]?.trim();
  return text && /^[A-Z0-9 '’&/-]+$/.test(text) && /[A-Z]{3}/.test(text) ? text : null;
}

/**
 * Splits a diagnosis into its named sections (`## WHAT IS WORKING` → "What is working"). Text before the first heading
 * becomes an untitled section, so nothing the Brain wrote is ever dropped.
 */
export function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of text.split("\n")) {
    const heading = headingOf(line);
    if (heading) {
      if (current) sections.push(current);
      current = { title: titleCase(heading), body: "" };
    } else {
      if (!current) current = { title: "", body: "" };
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.body.length > 0 || s.title.length > 0);
}

export function mondayOfNextWeek(weekStart: string): string {
  return mondayAfterWeeks(weekStart, 1);
}

/** The Monday `weeks` weeks after `weekStart` (a Monday). */
export function mondayAfterWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "5 – 11 Oct" for the week that starts on `weekStart` (a Monday). Month names are fixed: ICU spells September "Sept" in some runtimes. */
export function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const dayMonth = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return start.getUTCMonth() === end.getUTCMonth() ? `${start.getUTCDate()} – ${dayMonth(end)}` : `${dayMonth(start)} – ${dayMonth(end)}`;
}

/** The chip's label: the fix itself, with the minutes it asks for if the title does not already say so. */
export function chipLabel(fix: Fix): string {
  if (fix.minutes === null) return fix.title;
  return /\bmin(ute)?s?\b|\bhours?\b|\bh\b/i.test(fix.title) ? fix.title : `${fix.title} · ${fix.minutes} min`;
}

/** Seconds → "about 20 minutes" for a rate-limit message. */
export function waitText(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.ceil(seconds / 3600);
    return `about ${h} hour${h === 1 ? "" : "s"}`;
  }
  const m = Math.max(1, Math.ceil(seconds / 60));
  return `about ${m} minute${m === 1 ? "" : "s"}`;
}
