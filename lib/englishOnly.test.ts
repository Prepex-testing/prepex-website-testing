import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Product decision (20 Oct 2026): every word a student sees is English. No Hindi, no Hinglish, no transliteration.
// This fails if either comes back into the app, its components, the API client or the end-to-end specs.

const DEVANAGARI = /[ऀ-ॿ]/;
// High-signal Hinglish words that are never English. Short function words (ka, ki, ko, se, pe, par, ye ...) are too
// ambiguous for a scan and are covered by the review checklist in docs/open-items.md.
const HINGLISH =
  /\b(hai|hain|karo|kiya|aapka|aapke|aapki|isko|isse|mera|meri|tera|tumhari|bhai|yaar|dhanyavaad|dhanyavad|shaant|shaam|padhai|mehnat|hafta|hafte|bhejein|kijiye|dijiye|poochhiye|puchhiye|nahi|kholo|chahiye|chalega|hinglish|hindi)\b/i;

const ROOT = process.cwd();
const DIRS = ["app", "components", "lib", "e2e"];

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(p);
  }
}

describe("the website is English only", () => {
  const files: string[] = [];
  for (const d of DIRS) walk(join(ROOT, d), files);
  const self = join(ROOT, "lib", "englishOnly.test.ts");

  it("scans the whole app", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no Devanagari and no Hinglish word anywhere", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file === self) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (DEVANAGARI.test(line) || HINGLISH.test(line)) offenders.push(`${relative(ROOT, file).replace(/\\/g, "/")}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
