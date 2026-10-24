import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Everything a student reads during onboarding is plain English: no Hindi, no Hinglish, no transliteration.
 * This scans the onboarding screens and the components they use for the words that give Hinglish away, and
 * for Devanagari, so a slip fails CI instead of reaching a student.
 */

const ROOT = path.resolve(import.meta.dirname, "../..");
const TREES = ["app/(auth)", "components/onboarding", "components/timetable", "lib/onboarding", "lib/timetable", "components/ui/StepProgress.tsx"];

const HINGLISH = [
  "hai", "hain", "karo", "kiya", "kare", "aapka", "aapke", "aap", "isko", "ye", "wo", "pe", "bhi", "ka", "ki", "ke",
  "yaar", "bhai", "ji", "nahi", "kya", "kaise", "apna", "apne", "tum", "chalo", "abhi", "sab", "bahut", "accha", "theek",
];
const WORDS = new RegExp(`\\b(${HINGLISH.join("|")})\\b`, "i");
const DEVANAGARI = /[ऀ-ॿ]/;

function files(entry: string): string[] {
  const full = path.join(ROOT, entry);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((d) => files(path.join(entry, d.name)));
}

describe("onboarding copy is English only", () => {
  const sources = TREES.flatMap(files).filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith("copy.test.ts"));

  it("scans a real set of files", () => {
    expect(sources.length).toBeGreaterThan(15);
  });

  it.each(sources.map((f) => [path.relative(ROOT, f), f]))("%s", (_name, file) => {
    const lines = fs.readFileSync(file as string, "utf8").split("\n");
    const offenders = lines
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => WORDS.test(text) || DEVANAGARI.test(text))
      .map(({ text, line }) => `${line}: ${text.trim()}`);
    expect(offenders).toEqual([]);
  });
});
