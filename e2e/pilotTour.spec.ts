import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Pilot prep: the Day-1 tour on Home. core-service must be started with PILOT_TOUR=on. A freshly seeded student has never
 * been shown the tour (users.first_login_at is empty), so it appears on the first Home screen.
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";

async function tourState(page: Page) {
  return page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/tour`, { headers: { authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` } });
    return (await res.json()).data as { show: boolean };
  }, CORE);
}

/** Is the ring (the spotlight) over the element the step is about? */
async function ringOver(page: Page, anchor: string) {
  const ring = (await page.getByTestId("tour-ring").boundingBox())!;
  const boxes = await page.locator(`[data-tour="${anchor}"]`).evaluateAll((els) =>
    els
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })
      .filter((b) => b.w > 0 && b.h > 0),
  );
  const cx = ring.x + ring.width / 2;
  const cy = ring.y + ring.height / 2;
  return boxes.some((b) => cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h);
}

test("tour: three tooltips on Home, each spotlighting the right thing, Got it moves on, it ends, and never comes back", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-tour-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page); // lands on Home: the first tooltip is already up

  const tour = page.getByTestId("tour");
  await expect(tour).toBeVisible();
  await expect(tour).toHaveAttribute("aria-modal", "true");
  await expect(page.getByTestId("tour-counter")).toHaveText("1 of 3");
  await expect(page.getByTestId("tour-text")).toHaveText("Ye hai aapka Today's Plan — Prepex isko aapke weekly goals aur timetable se banata hai");
  expect(await ringOver(page, "plan"), "step 1 points at Plan for Today").toBe(true);
  const viewport = page.viewportSize()!;
  const bubble = (await page.getByTestId("tour-bubble").boundingBox())!;
  expect(bubble.x).toBeGreaterThanOrEqual(0);
  expect(bubble.x + bubble.width).toBeLessThanOrEqual(viewport.width);
  expect(bubble.y).toBeGreaterThanOrEqual(0);
  expect(bubble.y + bubble.height).toBeLessThanOrEqual(viewport.height);
  // the app's own first-day coach message stands down while the tour is up
  await expect(page.getByText("Welcome. Your plan is ready below.")).toHaveCount(0);
  await shot("1-plan");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="tour-next"], [data-testid="tour-skip"]');
  }

  await page.getByTestId("tour-next").click();
  await expect(page.getByTestId("tour-counter")).toHaveText("2 of 3");
  await expect(page.getByTestId("tour-text")).toContainText("Focus pe tap karo");
  await expect.poll(() => ringOver(page, "focus")).toBe(true); // the bottom bar on a phone, the sidebar on desktop
  await shot("2-focus");

  await page.getByTestId("tour-next").click();
  await expect(page.getByTestId("tour-counter")).toHaveText("3 of 3");
  await expect(page.getByTestId("tour-text")).toContainText("Log Mistake pe tap karo");
  await expect.poll(() => ringOver(page, "log-mistake")).toBe(true);
  const last = (await page.getByTestId("tour-bubble").boundingBox())!;
  expect(last.x).toBeGreaterThanOrEqual(0);
  expect(last.x + last.width).toBeLessThanOrEqual(viewport.width);
  expect(last.y + last.height).toBeLessThanOrEqual(viewport.height);
  await shot("3-mistake");
  if (mobile) await noHorizontalScroll(page);

  await page.getByTestId("tour-next").click();
  await expect(page.getByTestId("tour")).toHaveCount(0);

  // never again: the server has stamped this student, on this device and any other
  expect(await tourState(page)).toEqual({ show: false });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("tour")).toHaveCount(0);
});

test("tour: Skip ends it for good", async ({ page }) => {
  test.setTimeout(240_000);
  resetStudent();
  await onboardAndEnterApp(page);
  await expect(page.getByTestId("tour")).toBeVisible();
  await page.getByTestId("tour-skip").click();
  await expect(page.getByTestId("tour")).toHaveCount(0);
  expect(await tourState(page)).toEqual({ show: false });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.getByTestId("tour")).toHaveCount(0);
});
