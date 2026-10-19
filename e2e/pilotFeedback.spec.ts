import { expect, test } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Pilot prep: the floating Feedback button. core-service must be started with PILOT_FEEDBACK_BUTTON=on and
 * PILOT_ADMIN_TOKEN=e2e-admin-token-0123456789 (the admin list is read here with that token).
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const ADMIN = process.env.E2E_PILOT_ADMIN_TOKEN ?? "e2e-admin-token-0123456789";
// a 1x1 transparent PNG: the page re-encodes whatever is attached as a JPEG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

async function adminGet(path: string, token = ADMIN) {
  const res = await fetch(`${CORE}/api/pilot-feedback${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json() };
}

test("feedback: the button floats clear of the bottom bar, the form needs words, sends the page + rating + screenshot, and the operator can read it", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-feedback-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);
  const before = (await adminGet("")).body.data.total as number;

  // ── the button ────────────────────────────────────────────────────────────────────────────────
  await page.goto("/home");
  // the app's own first-day coach message can be on screen; it is not part of this test
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible({ timeout: 4000 }).catch(() => false)) await gotIt.click();
  const button = page.getByTestId("feedback-button");
  await expect(button).toBeVisible();
  await expect(button).toContainText("Feedback");
  const box = (await button.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x + box.width, "bottom-right").toBeGreaterThan(viewport.width * 0.7);
  expect(box.y + box.height, "bottom-right").toBeGreaterThan(viewport.height * 0.7);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  if (mobile) {
    const nav = (await page.locator("nav").last().boundingBox())!;
    expect(box.y + box.height, "does not sit on the bottom bar").toBeLessThanOrEqual(nav.y);
    await expectTapTargets(page, '[data-testid="feedback-button"]');
    await noHorizontalScroll(page);
  }
  await shot("button");

  // ── the form ──────────────────────────────────────────────────────────────────────────────────
  await button.click();
  await expect(page.getByRole("dialog", { name: "Send feedback" })).toBeVisible();
  await expect(page.getByTestId("feedback-send")).toBeDisabled();
  await page.getByTestId("feedback-text").fill("ok");
  await expect(page.getByTestId("feedback-send")).toBeDisabled();
  await page.getByTestId("feedback-text").fill("The today's plan card is confusing: I could not tell what to do first.");
  await page.getByTestId("feedback-star-2").click();
  await page.getByTestId("feedback-file").setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByTestId("feedback-shot")).toBeVisible();
  await shot("form");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="feedback-star-1"], [data-testid="feedback-send"], [data-testid="feedback-attach"], [data-testid="feedback-shot-remove"]');
  }
  await page.getByTestId("feedback-send").click();
  await expect(page.getByTestId("feedback-thanks")).toBeVisible();
  await shot("thanks");
  await page.getByTestId("feedback-done").click();
  await expect(page.getByRole("dialog", { name: "Send feedback" })).toHaveCount(0);

  // ── what the operator sees ────────────────────────────────────────────────────────────────────
  const list = await adminGet("");
  expect(list.status).toBe(200);
  expect(list.body.data.total).toBe(before + 1);
  const mine = list.body.data.items[0];
  expect(mine).toMatchObject({ screen: "/home", rating: 2, hasScreenshot: true, feedbackText: "The today's plan card is confusing: I could not tell what to do first." });
  expect(mine).not.toHaveProperty("screenshot");
  const full = await adminGet(`/${mine.id}`);
  expect(full.body.data.feedback.screenshot).toMatch(/^data:image\/jpeg;base64,/);
  expect((await adminGet("", "not-the-token-not-the-token")).status).toBe(401);

  // ── another page, no rating, no picture; the page it was sent from is recorded ────────────────
  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByTestId("feedback-button").click();
  await page.getByTestId("feedback-text").fill("Goals page: loved the suggest button!");
  await page.getByTestId("feedback-send").click();
  await expect(page.getByTestId("feedback-thanks")).toBeVisible();
  const second = (await adminGet("?screen=goals")).body.data.items[0];
  expect(second).toMatchObject({ screen: "/goals", rating: null, hasScreenshot: false });
  const low = await adminGet("?rating=2");
  expect(low.body.data.items.every((i: { rating: number }) => i.rating === 2)).toBe(true);
});
