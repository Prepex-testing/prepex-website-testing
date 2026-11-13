import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { queryDb } from "./helpers";

/**
 * Onboarding v2, Part C — the Pexo canvas against the REAL local stack. Each test signs up a brand-new account with an
 * e-mailed code (the code's hash is replaced in the LOCAL database by a known one), then answers by tapping only.
 */
test.describe.configure({ mode: "serial" });

const TEST_CODE = "246802";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function flagsOn(page: Page) {
  await page.addInitScript(() => window.localStorage.removeItem("prepex:auth-flags"));
  await page.route("**/api/auth/flags", (r) => r.fulfill({ json: { success: true, data: { onboardingV2: true, guestMode: false } } }));
}

async function signUp(page: Page, tag: string): Promise<string> {
  const email = `v2.${tag}.${Date.now()}@test.prepex.io`;
  await page.goto("/start");
  await page.getByTestId("signin-email").click();
  await page.getByPlaceholder("Rohan@example.com").fill(email);
  await page.getByTestId("signin-send-code").click();
  await expect(page.getByTestId("signin-code")).toBeVisible({ timeout: 20_000 });
  queryDb("UPDATE auth.email_login_codes SET code_hash = $1 WHERE email = $2", [sha256(TEST_CODE), email]);
  await page.getByTestId("signin-code").fill(TEST_CODE);
  await expect(page.getByTestId("onb-canvas")).toBeVisible({ timeout: 45_000 });
  return email;
}

const at = (page: Page, q: string) => expect(page.getByTestId("onb-canvas")).toHaveAttribute("data-question", q, { timeout: 20_000 });

type Path = { adjust?: boolean; name: string; cls: "CLASS_11" | "CLASS_12" | "DROPPER"; school?: "morning" | "day" | "none"; coaching: "OFFLINE" | "ONLINE" | "SELF"; ctime?: "MORNING" | "AFTERNOON" | "EVENING"; hours?: number; language?: "hi"; sound?: boolean };

async function answerAll(page: Page, p: Path) {
  await at(page, "prefs");
  if (p.language === "hi") await page.getByTestId("onb-lang-hi").click();
  if (p.sound) await page.getByTestId("onb-sound-on").click();
  await page.getByTestId("onb-prefs-next").click();
  await at(page, "name");
  await page.getByTestId("onb-name").fill("Asha Rao");
  await page.getByTestId("onb-name-next").click();
  await at(page, "exam");
  await page.getByTestId("onb-exam-both").click();
  await at(page, "class");
  await page.getByTestId(`onb-class-${p.cls}`).click();
  await at(page, "exam_date");
  // the date Pexo confirms is a real, filled number
  await expect(page.getByTestId("onb-pexo-text")).toHaveText(/\d+/, { timeout: 15_000 });
  await page.getByTestId("onb-date-yes").click();
  if (p.cls !== "DROPPER") {
    await at(page, "school");
    await page.getByTestId(`onb-school-${p.school ?? "none"}`).click();
  }
  await at(page, "coaching");
  await page.getByTestId(`onb-coaching-${p.coaching}`).click();
  if (p.coaching === "OFFLINE") {
    await at(page, "coaching_time");
    await page.getByTestId(`onb-ctime-${p.ctime ?? "EVENING"}`).click();
  }
  await at(page, "hours");
  await page.getByTestId(`onb-hours-${p.hours ?? 4}`).click();
  await at(page, "windows");
  await page.getByTestId("onb-window-EVENING").click();
  await page.getByTestId("onb-windows-next").click();
  await at(page, "week");
  await expect(page.getByTestId("onb-pexo-text")).toHaveText(/\d/);
  if (p.adjust) {
    // Adjust opens ONE day that applies to the whole week, with the switch to edit days separately
    await page.getByTestId("onb-week-adjust").click();
    await expect(page.getByTestId("onb-week-editor")).toBeVisible();
    await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("day-col-0")).toBeVisible();
    await expect(page.locator('[data-testid^="day-col-"]')).toHaveCount(1);
    await page.getByTestId("save-timetable").click();
    await expect(page.getByTestId("onb-week-editor")).toHaveCount(0);
  }
  await page.getByTestId("onb-week-ok").click();
  await at(page, "chapters");
  await page.getByTestId("onb-skip").click();
  // building, then the goals proposal (or straight to the finale when there is nothing to propose)
  await expect(page.getByTestId("onb-goals").or(page.locator("text=/welcome|Welcome/").first())).toBeVisible({ timeout: 90_000 });
  if (await page.getByTestId("onb-goals").isVisible()) {
    await expect(page.getByTestId("onb-pexo-text")).toHaveText(/\d+\D+\d+\D+\d+/);
    await page.getByTestId("onb-goals-ok").click();
  }
  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 60_000 });
}

function savedProfile(email: string) {
  const [row] = queryDb<{ current_level: string; coaching_type: string; jee_main_date: string | null; jee_advanced_date: string | null }>(
    "SELECT p.current_level, p.coaching_type, p.jee_main_date, p.jee_advanced_date FROM core.user_profiles p JOIN core.users u ON u.id = p.user_id WHERE u.email = $1",
    [email],
  );
  const blocks = queryDb<{ day_of_week: number; activity_type: string; start_time: string; end_time: string }>(
    "SELECT b.day_of_week, b.activity_type, left(b.start_time::text, 5) AS start_time, left(b.end_time::text, 5) AS end_time FROM core.timetable_blocks b JOIN core.weekly_timetables t ON t.id = b.timetable_id JOIN core.users u ON u.id = t.user_id WHERE u.email = $1 AND t.effective_to IS NULL",
    [email],
  );
  const events = queryDb<{ question: string; kind: string; flow_version: string }>(
    "SELECT e.question, e.kind, e.flow_version FROM core.onboarding_events e JOIN core.users u ON u.id = e.user_id WHERE u.email = $1",
    [email],
  );
  return { row, blocks, events };
}

test("tap-only: Class 12, morning school, self-study, in 90 seconds or less", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real signups: desktop project only");
  await flagsOn(page);
  const email = await signUp(page, "fast");
  const t0 = Date.now();
  await answerAll(page, { name: "fast", cls: "CLASS_12", school: "morning", coaching: "SELF" });
  const seconds = (Date.now() - t0) / 1000;
  test.info().annotations.push({ type: "tap-only seconds", description: seconds.toFixed(1) });
  console.log(`[onboarding-v2] tap-only canvas took ${seconds.toFixed(1)} s`);
  expect(seconds).toBeLessThanOrEqual(90);

  const { row, blocks, events } = savedProfile(email);
  expect(row).toMatchObject({ current_level: "CLASS_12", coaching_type: "SELF_PREP", jee_main_date: null, jee_advanced_date: null });
  expect(blocks.filter((b) => b.day_of_week === 0 && b.activity_type === "SCHOOL")).toEqual([expect.objectContaining({ start_time: "07:00", end_time: "13:00" })]);
  expect(blocks.some((b) => b.activity_type === "REVISION")).toBe(true);
  // metrics: every question shown and answered, flow v2
  expect(events.filter((e) => e.kind === "view").length).toBeGreaterThanOrEqual(10);
  expect(events.every((e) => e.flow_version === "v2")).toBe(true);
});

test("Adjust opens one day for the whole week, saved as a uniform week", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real signups: desktop project only");
  await flagsOn(page);
  const email = await signUp(page, "adjust");
  await answerAll(page, { name: "adjust", cls: "CLASS_12", school: "morning", coaching: "SELF", adjust: true });
  const [profile] = queryDb<{ timetable_uniform_week: boolean }>("SELECT p.timetable_uniform_week FROM core.user_profiles p JOIN core.users u ON u.id = p.user_id WHERE u.email = $1", [email]);
  expect(profile!.timetable_uniform_week).toBe(true);
  const { blocks } = savedProfile(email);
  const dayOf = (d: number) => blocks.filter((b) => b.day_of_week === d).map((b) => `${b.activity_type} ${b.start_time}-${b.end_time}`).sort().join("|");
  for (let d = 1; d < 7; d++) expect(dayOf(d)).toBe(dayOf(0));
});

test("Class 11, morning school, offline afternoon coaching never overlapping school", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real signups: desktop project only");
  await flagsOn(page);
  const email = await signUp(page, "c11");
  // the morning coaching slot clashes with morning school and cannot be picked
  await answerAll(page, { name: "c11", cls: "CLASS_11", school: "morning", coaching: "OFFLINE", ctime: "AFTERNOON" });
  const { row, blocks } = savedProfile(email);
  expect(row).toMatchObject({ current_level: "CLASS_11", coaching_type: "COACHING" });
  const monday = blocks.filter((b) => b.day_of_week === 0);
  expect(monday.find((b) => b.activity_type === "COACHING")).toMatchObject({ start_time: "13:00", end_time: "16:00" });
  expect(monday.find((b) => b.activity_type === "SCHOOL")).toMatchObject({ start_time: "07:00", end_time: "13:00" });
});

test("dropper with offline evening coaching, 8 hours, Hinglish and sound", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real signups: desktop project only");
  await flagsOn(page);
  const email = await signUp(page, "drop");
  await page.addInitScript(() => {
    // count what Pexo says out loud (the browser's speech engine is replaced)
    (window as unknown as { spoken: string[] }).spoken = [];
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => void (window as unknown as { spoken: string[] }).spoken.push(u.text);
  });
  await page.reload();
  await answerAll(page, { name: "drop", cls: "DROPPER", coaching: "OFFLINE", ctime: "EVENING", hours: 8, language: "hi", sound: true });
  const { row, blocks } = savedProfile(email);
  expect(row).toMatchObject({ current_level: "DROPPER_1", coaching_type: "COACHING" });
  expect(blocks.filter((b) => b.day_of_week === 0 && b.activity_type === "COACHING")).toEqual([expect.objectContaining({ start_time: "16:00", end_time: "19:00" })]);
  expect(blocks.some((b) => b.activity_type === "SCHOOL")).toBe(false);
});

test("Hinglish lines on the canvas, text only, reduced motion", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "real signups: desktop project only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await flagsOn(page);
  await signUp(page, "hi");
  await page.getByTestId("onb-lang-hi").click();
  await page.getByTestId("onb-prefs-next").click();
  await at(page, "name");
  // the Hinglish version of onb.name (Pexo lines only; the chips stay English)
  const hi = await page.getByTestId("onb-pexo-text").textContent();
  expect(hi).not.toBe("What should I call you?");
  await expect(page.getByTestId("onb-name-next")).toBeVisible();
});

test("ONBOARDING_V2 off: /onboarding/v2 sends students to the old first step", async ({ page }) => {
  await page.route("**/api/auth/flags", (r) => r.fulfill({ json: { success: true, data: { onboardingV2: false, guestMode: false } } }));
  await page.addInitScript(() => window.localStorage.removeItem("prepex:auth-flags"));
  await page.goto("/onboarding/v2");
  await expect(page).not.toHaveURL(/onboarding\/v2/, { timeout: 15_000 });
});
