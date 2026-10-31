/** 9047 seconds -> "2:30:47". Hours are not capped at 24: the total is the student's real study time. */
export function clockText(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** The days-left tile: a big number and a small line, negative once the date has passed. */
export function daysLeftText(days: number): { big: string; small: string } {
  if (days < 0) return { big: "Done", small: "Your exam date has passed" };
  if (days === 0) return { big: "Today", small: "Your exam is today" };
  return { big: String(days), small: days === 1 ? "day to go" : "days to go" };
}

/** The word the timer's start link uses for a subject name ("Physics" -> "physics"). Unknown names pass through lowercased. */
export function subjectKey(name: string): string {
  return name.trim().toLowerCase().replace(/^mathematics$/, "maths");
}
