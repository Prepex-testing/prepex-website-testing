import type { ReportLimit } from "@/lib/api/diagnosisReports";
import type { PrefillWeek } from "@/lib/goals/prefill";

/** Wording and parsing for the 30-day diagnosis page. */

/** "2 diagnoses left today, resets at midnight IST". */
export function remainingText(limit: Pick<ReportLimit, "remaining">): string {
  if (limit.remaining <= 0) return "No diagnoses left today. They reset at midnight IST.";
  return `${limit.remaining} diagnos${limit.remaining === 1 ? "is" : "es"} left today, resets at midnight IST`;
}

/** "19 Oct, 3:40 pm" in IST, whatever the device's own zone. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")}, ${get("hour")}:${get("minute")} ${get("dayPeriod").toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// the body of a section
// ---------------------------------------------------------------------------

export type Block = { kind: "p"; text: string } | { kind: "h"; text: string } | { kind: "ul"; items: string[] };

const PLAIN = (text: string) => text.replace(/\*\*/g, "").replace(/__/g, "");

/** A section's text as paragraphs, small headings ("### Week 1") and bullet lists. */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (list && list.length > 0) blocks.push({ kind: "ul", items: list });
    list = null;
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    const bullet = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      (list ??= []).push(PLAIN(bullet[1]!));
      continue;
    }
    flush();
    const heading = /^#{3,6}\s+(.*)$/.exec(line);
    if (heading) blocks.push({ kind: "h", text: PLAIN(heading[1]!) });
    else blocks.push({ kind: "p", text: PLAIN(line) });
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------------------
// the action plan: "Save to goals"
// ---------------------------------------------------------------------------

export type PlanItem = {
  /** "Week 1" */
  label: string;
  /** What the plan says for that week, as plain text. */
  text: string;
  /** The week it belongs to, for the goals page; null beyond four weeks ahead. */
  week: PrefillWeek | null;
  /** Study minutes for a goal: the hours the text mentions, or three hours when it does not say. */
  minutes: number;
  chapterId: string | null;
  chapterName: string | null;
};

const WEEK_LINE = /^(?:#{1,6}\s*|[-*•]\s*)?(?:\*\*|__)?\s*Week\s+(\d)\b/i;
const WEEKS: Record<number, PrefillWeek> = { 1: "current", 2: "next", 3: "plus2", 4: "plus3" };
const DEFAULT_MINUTES = 180;

function hoursIn(text: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|hours?\b)/i.exec(text);
  if (!m) return null;
  const h = Number(m[1]);
  return Number.isFinite(h) && h > 0 ? h : null;
}

/** The "Week N: ..." entries of a plan section, each with a goal's minutes and, when it names one, a chapter. */
export function planItems(body: string, chapters: { id: string; name: string }[]): PlanItem[] {
  const groups: { week: number; lines: string[] }[] = [];
  for (const line of body.split("\n")) {
    const m = WEEK_LINE.exec(line.trim());
    if (m) groups.push({ week: Number(m[1]), lines: [line] });
    else if (groups.length > 0) groups[groups.length - 1]!.lines.push(line);
  }
  return groups
    .filter((g, i) => g.week >= 1 && g.week <= 9 && groups.findIndex((x) => x.week === g.week) === i)
    .map((g) => {
      const text = PLAIN(g.lines.map((l) => l.replace(/^#{1,6}\s*|^[-*•]\s*/, "").trim()).filter(Boolean).join(" "));
      const lower = text.toLowerCase();
      const found = chapters.filter((c) => lower.includes(c.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
      const hours = hoursIn(text);
      const minutes = Math.min(6000, Math.max(30, Math.round((hours ?? DEFAULT_MINUTES / 60) * 60)));
      return { label: `Week ${g.week}`, text, week: WEEKS[g.week] ?? null, minutes, chapterId: found?.id ?? null, chapterName: found?.name ?? null };
    });
}

/** The plan section split into what comes before "Week 1" (kept as ordinary text) and the week-by-week items. */
export function splitPlan(body: string, chapters: { id: string; name: string }[]): { intro: string; items: PlanItem[] } {
  const lines = body.split("\n");
  const first = lines.findIndex((l) => WEEK_LINE.test(l.trim()));
  if (first === -1) return { intro: body, items: [] };
  return { intro: lines.slice(0, first).join("\n").trim(), items: planItems(lines.slice(first).join("\n"), chapters) };
}
