import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Pexo in a real browser against a stubbed API (no backend, no account). Set PEXO_SHOTS_DIR to save the screenshots:
 * every mood at every size, in light and dark, at 390 and 1440 wide.
 */

const SHOTS = process.env.PEXO_SHOTS_DIR;
const MOODS = ["happy", "proud", "celebrating", "cheering", "curious", "thinking", "focused", "calm", "sleepy", "waving"];

export async function shot(page: Page, name: string, fullPage = true) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`every mood at every size (${theme}, ${width})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((t) => localStorage.setItem("prepex-theme", t), theme);
      await page.goto("/pexo-lab");
      await expect(page.getByTestId("pexo-lab")).toBeVisible();
      for (const mood of MOODS) {
        const card = page.getByTestId(`lab-mood-${mood}`);
        await expect(card.locator("svg.pexo")).toHaveCount(4);
        for (const size of [24, 48, 96, 160]) {
          const box = await card.locator(`svg.pexo[data-size="${size}"]`).boundingBox();
          expect(Math.round(box!.width), `${mood} ${size}`).toBe(size); // a fixed box: Pexo never shifts the layout
        }
      }
      // the body is the logo orange token, in both themes
      const fill = await page.locator('[data-testid="lab-mood-happy"] svg.pexo[data-size="160"] circle[r="40"]').evaluate((el) => getComputedStyle(el).fill);
      const cta = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.color = "var(--cta)";
        document.body.appendChild(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
      expect(fill).toBe(cta);
      await page.waitForTimeout(1600); // let the one-shot celebration land
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(1);
      await shot(page, `moods-${theme}-${width}`);
    });
  }
}

test("reduced motion: Pexo is still (no running animations, no pointer-follow)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pexo-lab");
  await expect(page.getByTestId("pexo-lab")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await page.mouse.move(40, 40);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => ({
    running: [...document.querySelectorAll("svg.pexo *")].flatMap((el) => el.getAnimations()).filter((a) => a.playState === "running").length,
    followed: [...document.querySelectorAll<SVGSVGElement>("svg.pexo")].filter((s) => s.style.getPropertyValue("--pexo-px") !== "").length,
  }));
  expect(state).toEqual({ running: 0, followed: 0 });
});

test("full motion: the pupils follow the pointer by at most 3 px and the body breathes", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "pointer-follow is checked with a mouse");
  await page.goto("/pexo-lab");
  await expect(page.getByTestId("pexo-lab")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  // the listener is attached after hydration, so keep the pointer moving until Pexo notices it
  let step = 0;
  await expect
    .poll(async () => {
      step += 1;
      await page.mouse.move(5 + (step % 5) * 3, 5 + (step % 3) * 4);
      return page.locator('[data-testid="lab-mood-calm"] svg.pexo[data-size="160"]').evaluate((s: SVGSVGElement) => s.style.getPropertyValue("--pexo-px"));
    })
    .not.toBe("");
  const travel = await page.locator('[data-testid="lab-mood-calm"] svg.pexo[data-size="160"]').evaluate((s: SVGSVGElement) => Math.hypot(parseFloat(s.style.getPropertyValue("--pexo-px")), parseFloat(s.style.getPropertyValue("--pexo-py"))));
  expect(travel).toBeGreaterThan(0);
  expect(travel).toBeLessThanOrEqual(3.01);
  const breathing = await page.locator('[data-testid="lab-mood-calm"] svg.pexo[data-size="160"] [data-part="body"]').evaluate((g) => g.getAnimations().some((a) => a.playState === "running"));
  expect(breathing).toBe(true);
});
