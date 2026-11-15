/**
 * Launch step 2 (owner decision 1a): the old password sign-up is retired. Its pages redirect to /start on the server,
 * and no screen links to them any more. (The auth API answers 410 for /register.)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p) ? [p] : [];
  });
}

describe("retired password sign-up", () => {
  it("redirects every old sign-up path to /start", async () => {
    const redirects = await nextConfig.redirects!();
    for (const source of ["/create-account", "/email-verification", "/register"]) {
      expect(redirects.find((r) => r.source === source)?.destination).toBe("/start");
    }
  });

  it("no screen links to the old sign-up pages", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap(files)
      .filter((p) => /["'`]\/(create-account|email-verification)\b/.test(readFileSync(p, "utf8")));
    expect(offenders).toEqual([]);
  });
});
