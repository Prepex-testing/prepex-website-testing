import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";

/** Logs a study session straight to the API (the Study log form is covered by phase2c) for the chapter named. */
async function logStudy(page: Page, chapterName: string, minutes: number) {
  const status = await page.evaluate(
    async ({ base, chapterName, minutes }) => {
      const headers = { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` };
      const syllabus = await (await fetch(`${base}/api/syllabus`, { headers })).json();
      const chapter = (syllabus.data.subjects as { chapters: { chapterId: string; name: string; subjectId: number }[] }[]).flatMap((s) => s.chapters).find((c) => c.name === chapterName);
      if (!chapter) return 404;
      const res = await fetch(`${base}/api/study-sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ subjectId: chapter.subjectId, chapterId: chapter.chapterId, durationMinutes: minutes, loggedAt: new Date(Date.now() - 120_000).toISOString() }),
      });
      return res.status;
    },
    { base: CORE, chapterName, minutes },
  );
  expect(status, `logging ${minutes} minutes of ${chapterName}`).toBe(201);
}

test("mock test: log a mock → analytics shows the right projected rank", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-4-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);

  // ── the hub links to it ────────────────────────────────────────────────────
  await page.goto("/logs");
  await expect(page.getByTestId("hub-mocks")).toBeVisible();
  await expect(page.getByTestId("hub-mocks-value")).toHaveText("0");
  await page.getByTestId("hub-mocks").click();
  await expect(page.getByTestId("mocks-page")).toBeVisible();
  if (mobile) {
    await expectTapTargets(page, '[role="tab"]');
    await noHorizontalScroll(page);
  }

  // ── the total adds itself up; a wrong total is caught before it is sent ─────
  await page.getByTestId("mock-name").fill("AITS 4");
  await page.getByTestId("mock-marks-physics").fill("60");
  await page.getByTestId("mock-marks-chemistry").fill("70");
  await page.getByTestId("mock-marks-maths").fill("50");
  await expect(page.getByTestId("mock-total")).toHaveValue("180");
  await expect(page.getByTestId("mock-total-status")).toContainText("Added up from your subjects: 180");
  await page.getByTestId("mock-total").fill("185");
  await expect(page.getByTestId("mock-total-status")).toContainText("must equal the sum of the subjects (180)");
  await page.getByTestId("mock-submit").click();
  await expect(page.getByTestId("mock-form").getByRole("alert")).toContainText("must equal the sum");
  await page.getByTestId("mock-auto-total").click();
  await expect(page.getByTestId("mock-total")).toHaveValue("180");

  // ── percentile → projected rank; pick a weak chapter ───────────────────────
  await page.getByTestId("mock-percentile").fill("96.5");
  await page.getByTestId("mock-minutes").fill("175");
  await page.getByTestId("mock-weak-search").fill("kinem");
  await page.locator('[data-testid^="mock-weak-chapter-"]').first().click();
  await expect(page.locator('[data-testid^="mock-weak-chip-"]')).toHaveCount(1);
  await shot("mock-form");
  if (mobile) await noHorizontalScroll(page);
  await page.getByTestId("mock-submit").click();
  await expect(page.getByTestId("toast")).toContainText("Logged: 180/300");
  await expect(page.getByTestId("toast")).toContainText("~49,000");

  // ── all mocks ──────────────────────────────────────────────────────────────
  await page.getByTestId("mocks-tab-all").click();
  const row = page.locator('[data-testid^="mock-row-"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("AITS 4");
  await expect(row).toContainText("Weak: Kinematics");
  await expect(page.locator('[data-testid^="mock-rank-"]')).toContainText("96.5 percentile · rank ~49,000");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="mock-share-"], [data-testid^="mock-edit-"], [data-testid^="mock-plan-"]');
    await noHorizontalScroll(page);
  }

  // ── analytics: the projection is 3.5 % of the assumed 14 lakh candidates ───
  await page.getByTestId("mocks-tab-analytics").click();
  await expect(page.getByTestId("mock-analytics")).toBeVisible();
  await expect(page.getByTestId("mock-total-count")).toHaveText("1");
  await expect(page.getByTestId("mock-latest-score")).toHaveText("60%");
  await expect(page.getByTestId("mock-projected-rank")).toHaveText("~49,000");
  await expect(page.getByTestId("mock-projection")).toContainText("96.5 percentile");
  await expect(page.getByTestId("mock-projection")).toContainText("14,00,000 candidates");
  await expect(page.getByTestId("mock-weak-chapters")).toContainText("Kinematics");
  await expect(page.getByTestId("mock-trend-chart")).toBeVisible();
  await shot("mock-analytics");
  if (mobile) await noHorizontalScroll(page);

  // a target rank shows the gap
  await page.getByTestId("mock-target-rank").fill("30000");
  await page.getByTestId("mock-target-rank").press("Enter");
  await expect(page.getByTestId("mock-target-gap")).toContainText("19,000 ranks to go to reach 30,000");

  // the master dashboard carries the same projection
  await page.goto("/analytics");
  await expect(page.getByTestId("tile-rank-value")).toHaveText("~49,000");

  // ── share card ─────────────────────────────────────────────────────────────
  await page.goto("/logs/mocks");
  await page.getByTestId("mocks-tab-share").click();
  await expect(page.getByTestId("mock-share-preview")).toBeVisible();
  await expect(page.getByTestId("mock-share-download")).toBeEnabled();
  await shot("mock-share");
});

test("syllabus: open a chapter → see its data → mark theory done → it sticks", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-4-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);
  await logStudy(page, "Kinematics", 90);

  // ── the Stats tab is the way in, and the switcher reaches the syllabus ─────
  await page.goto("/home");
  await page.locator('a[href="/analytics"]:visible').first().click();
  await expect(page).toHaveURL(/\/analytics/);
  await page.getByTestId("insights-tabs").getByRole("link", { name: "Syllabus" }).click();
  await expect(page.getByTestId("syllabus-page")).toBeVisible();

  // ── the list: subject tabs, strength dot, hours and status per chapter ─────
  await expect(page.getByTestId("syllabus-tab-1")).toHaveAttribute("aria-selected", "true");
  const row = page.locator('[data-testid^="chapter-row-"]', { hasText: "Kinematics" });
  await expect(row).toHaveAttribute("data-theory", "learning");
  await expect(row).toHaveAttribute("data-strength", "medium");
  await expect(row).toContainText("1.5h");
  await expect(page.getByTestId("syllabus-summary-text")).toContainText("0 of 4 theory done");
  await page.getByTestId("syllabus-tab-2").click();
  await expect(page.locator('[data-testid^="chapter-row-"]', { hasText: "Atomic Structure" })).toHaveAttribute("data-strength", "unrated");
  await page.getByTestId("syllabus-tab-1").click();
  await shot("syllabus-list");
  if (mobile) {
    await expectTapTargets(page, '[role="tab"], [data-testid^="chapter-row-"]');
    await noHorizontalScroll(page);
  }

  // ── the chapter: its data, then mark theory done ───────────────────────────
  await row.click();
  await expect(page.getByTestId("chapter-page")).toBeVisible();
  await expect(page.getByTestId("chapter-hours")).toHaveText("1.5h");
  await expect(page.getByTestId("linked-sessions")).toHaveText("1");
  await expect(page.getByTestId("theory-learning")).toHaveAttribute("aria-checked", "true");
  await shot("chapter");
  if (mobile) {
    await expectTapTargets(page, '[data-testid^="theory-"], [data-testid$="-inc"], [data-testid$="-dec"]');
    await noHorizontalScroll(page);
  }
  await page.getByTestId("theory-studied").click();
  await expect(page.getByTestId("theory-studied")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("count-dpp-inc").click();
  await expect(page.getByTestId("count-dpp-value")).toHaveText("1");

  // a reload proves it is saved, not just shown
  await page.reload();
  await expect(page.getByTestId("theory-studied")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("count-dpp-value")).toHaveText("1");
  await expect(page.getByTestId("chapter-hours")).toHaveText("1.5h");

  // ── "Schedule study" puts it on the planner ────────────────────────────────
  await page.getByTestId("schedule-open").click();
  await expect(page.getByTestId("dates-picker")).toBeVisible();
  await page.getByTestId("dates-confirm").click();
  await expect(page.getByTestId("dates-error")).toHaveText("Pick at least one day.");
  await page.locator('[data-testid^="dates-day-"]').nth(2).click();
  await page.getByTestId("dates-slot-EVENING").click();
  await page.getByTestId("dates-confirm").click();
  await expect(page.getByTestId("toast")).toContainText("Scheduled on 1 day");
  await expect(page.getByTestId("linked-planned")).toBeVisible();

  // ── back on the list: it counts as done ────────────────────────────────────
  await page.goto("/syllabus");
  await expect(page.locator('[data-testid^="chapter-row-"]', { hasText: "Kinematics" })).toHaveAttribute("data-theory", "studied");
  await expect(page.getByTestId("syllabus-summary-text")).toContainText("1 of 4 theory done");
  await shot("syllabus-after");
});

test("analytics: the dashboard → tap the hours tile → the daily breakdown adds up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-4-${name}.png` });

  resetStudent();
  await onboardAndEnterApp(page);
  await logStudy(page, "Kinematics", 90);
  await logStudy(page, "Atomic Structure", 30);

  await page.goto("/analytics");
  await expect(page.getByTestId("analytics-page")).toBeVisible();
  await expect(page.getByTestId("tile-hours-today-value")).toHaveText("2h");
  await expect(page.getByTestId("tile-hours-week-value")).toHaveText("2h");
  await expect(page.getByTestId("tile-hours-all-value")).toHaveText("2h");
  await expect(page.getByTestId("tile-mistakes-value")).toHaveText("0");
  // this month's split by subject adds up to the same two hours
  await expect(page.getByTestId("subject-split")).toBeVisible();
  await expect(page.getByTestId("subject-split")).toContainText("Physics");
  await expect(page.getByTestId("subject-split")).toContainText("1h 30m");
  await expect(page.getByTestId("subject-split")).toContainText("Chemistry");
  // chapter strength: both chapters are rated "medium" (time, no questions yet), the rest not rated
  await expect(page.getByTestId("strength-count-medium")).toHaveText("2");
  await expect(page.getByTestId("strength-count-unrated")).toHaveText("10");
  await expect(page.getByTestId("accuracy-trend")).toBeVisible();
  await shot("analytics");
  if (mobile) {
    await expectTapTargets(page, 'a[data-testid^="tile-"], [data-testid="insights-tabs"] a');
    await noHorizontalScroll(page);
  }

  // ── tap the tile → daily breakdown ─────────────────────────────────────────
  await page.getByTestId("tile-hours-week").click();
  await expect(page.getByTestId("drill-page")).toBeVisible();
  await expect(page).toHaveURL(/\/analytics\/drill\/hours\?period=week/);
  await expect(page.getByTestId("drill-total")).toHaveText("2h");
  await expect(page.getByTestId("drill-chart")).toBeVisible();
  const table = page.getByTestId("drill-table");
  const todayRow = table.locator("tbody tr").first(); // newest first: today
  await expect(todayRow.locator("td")).toHaveText("2h");
  // the rows add up to the total shown above
  const values = await table.locator("tbody td").allTextContents();
  const minutes = values.reduce((sum, v) => {
    const h = /(\d+)h/.exec(v);
    const m = /(\d+)m/.exec(v);
    return sum + (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  }, 0);
  expect(minutes).toBe(120);
  await expect(page.getByTestId("drill-subjects")).toContainText("Physics");
  await shot("drill");
  if (mobile) await noHorizontalScroll(page);

  // period and subject filters answer, and the month matches
  await page.getByTestId("drill-period-month").click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.getByTestId("drill-total")).toHaveText("2h");
  await page.getByTestId("drill-subject").selectOption({ label: "Chemistry" });
  await expect(page).toHaveURL(/subject=2/);
  await expect(page.getByTestId("drill-total")).toHaveText("30m");
  await page.goBack();

  // ── the calendar shows the same day as studied ─────────────────────────────
  await page.goto("/calendar");
  await expect(page.getByTestId("month-heatmap")).toBeVisible();
  await expect(page.locator('[data-testid^="cal-day-"][data-today="true"]')).toHaveAttribute("data-level", "3");
  await page.locator('[data-testid^="cal-day-"][data-today="true"]').click();
  await expect(page.getByTestId("day-modal")).toBeVisible();
  await expect(page.getByTestId("day-studied")).toHaveText("2h");
  await expect(page.getByTestId("day-study")).toContainText("Kinematics");
  await shot("calendar-day");
  await page.getByTestId("day-close").click();
  // month navigation, both ways
  const title = await page.getByTestId("cal-title").textContent();
  await page.getByTestId("cal-next").click();
  await expect(page.getByTestId("cal-title")).not.toHaveText(title ?? "");
  await page.getByTestId("cal-prev").click();
  await expect(page.getByTestId("cal-title")).toHaveText(title ?? "");
  if (mobile) await noHorizontalScroll(page);
});
