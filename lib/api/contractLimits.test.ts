import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * QA pass: three screens asked the API for more rows than it allows, so every load answered 400 and the screen showed
 * nothing (Home's mocks count, the revision side panel, a notebook's page list). This scans every call site of the
 * paged list functions and checks the `limit` against the server's cap.
 */
const CAPS: Record<string, number> = {
  // core-service/src/lib/cursor.ts: limit max 50
  listMocks: 50,
  listRevisions: 50,
  listPracticeLogs: 50,
  listBacklogItems: 50,
  listStudySessions: 50,
  // core-service notebooks.validation.ts listEntriesQuery: limit max 100
  listEntries: 100,
};

const ROOT = join(__dirname, "..", "..");
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("paged list calls stay within the API's page size", () => {
  const files = ["app", "components", "lib"].flatMap((d) => sources(join(ROOT, d)));

  it("finds the call sites it checks", () => {
    const calls = files.flatMap((f) => [...readFileSync(f, "utf-8").matchAll(/\b(listMocks|listRevisions|listEntries)\(/g)]);
    expect(calls.length).toBeGreaterThan(3);
  });

  for (const [fn, cap] of Object.entries(CAPS)) {
    it(`${fn}: every literal limit is at most ${cap}`, () => {
      const over: string[] = [];
      for (const f of files) {
        const src = readFileSync(f, "utf-8");
        // up to the end of the statement, since arguments can contain calls (`from.toISOString()`)
        for (const m of src.matchAll(new RegExp(`\\b${fn}\\(\\{[^;]{0,200}?\\blimit:\\s*(\\d+)`, "g"))) {
          if (Number(m[1]) > cap) over.push(`${f.slice(ROOT.length + 1)}: limit ${m[1]}`);
        }
      }
      expect(over).toEqual([]);
    });
  }

  it("does not ask for the plan explanation endpoint, which does not exist (a failed request on every plan load)", () => {
    const hits = files.filter((f) => readFileSync(f, "utf-8").includes("/planner/today/explain"));
    expect(hits).toEqual([]);
  });
});
