import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** Every Pexo mood at all four sizes (the public Pexo lab page), light and dark. Set PEXO_SHOTS_DIR to save them. */
const SHOTS = process.env.PEXO_SHOTS_DIR;

for (const theme of ["light", "dark"] as const) {
  test(`every mood at every size (${theme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: theme });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/pexo-lab");
    await expect(page.locator("svg.pexo").first()).toBeVisible();
    expect(await page.locator("svg.pexo").count()).toBeGreaterThanOrEqual(40);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: path.join(SHOTS, `moods-${theme}-${info.project.name}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
