import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** Every Pexo mood at all four sizes (the public Pexo lab page), light and dark. Set PEXO_SHOTS_DIR to save them. */
const SHOTS = process.env.PEXO_SHOTS_DIR;

/** The Pexo lab is a development page (it 404s on a production build): these checks run against `next dev`. */
test.beforeEach(async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/pexo-lab`);
  test.skip(res.status() === 404, "the Pexo lab is development-only; run these against next dev");
});

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
