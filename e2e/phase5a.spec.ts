import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Phase 5A — the weekly AI diagnosis. Runs against a FAKE Brain (e2e/fake-brain.mjs on :4999); core-service must be
 * started with BRAIN_BASE_URL=http://127.0.0.1:4999 and BRAIN_API_KEY=e2e-brain-key. The real Brain is never called.
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const BRAIN = process.env.E2E_FAKE_BRAIN_URL ?? "http://127.0.0.1:4999";
const BRAIN_KEY = "e2e-brain-key";

async function brain(path: string, body?: unknown) {
  const res = await fetch(`${BRAIN}${path}`, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

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

test("5A: This week tab → Run now → report with three chips → chip pre-fills next week's goal; Brain down degrades politely", async ({ page }, info) => {
  test.setTimeout(300_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-5a-${name}.png` });

  await brain("/__reset", {});
  resetStudent();

  // the browser must never talk to the Brain: only core-service does
  const toBrain: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes(":4999")) toBrain.push(r.url());
  });

  await onboardAndEnterApp(page);

  // ── the tab is there, and fits a phone ─────────────────────────────────────
  await page.goto("/analytics");
  await expect(page.getByTestId("analytics-page")).toBeVisible();
  const tabs = page.getByTestId("insights-tabs");
  await expect(tabs.getByRole("link")).toHaveText(["Dashboard", "This week", "Calendar", "Syllabus", "Details"]);
  if (mobile) {
    await expectTapTargets(page, '[data-testid="insights-tabs"] a');
    await noHorizontalScroll(page);
  }
  await tabs.getByRole("link", { name: "This week" }).click();
  await expect(page).toHaveURL(/\/analytics\/week$/);
  await expect(page.getByTestId("week-page")).toBeVisible();
  await expect(tabs.getByRole("link", { name: "This week" })).toHaveAttribute("aria-current", "page");

  // ── nothing logged yet: an honest empty state, and Run now explains why it cannot run ──
  await expect(page.getByTestId("weekly-empty")).toBeVisible();
  await expect(page.getByTestId("weekly-run")).toHaveText("Run now");
  await page.getByTestId("weekly-run").click();
  await expect(page.getByTestId("weekly-run-error")).toContainText("nothing from the last 7 days");
  expect((await brain("/__requests")).length, "no Brain call for an empty week").toBe(0);
  await shot("empty");

  // ── log a week, run it ─────────────────────────────────────────────────────
  await logStudy(page, "Kinematics", 90);
  await logStudy(page, "Atomic Structure", 30);
  await brain("/__mode", { delayMs: 2500 });
  await page.getByTestId("weekly-run").click();
  await expect(page.getByTestId("weekly-running")).toBeVisible();
  await expect(page.getByTestId("weekly-run")).toBeDisabled();
  await shot("running");
  if (mobile) await noHorizontalScroll(page);

  await expect(page.getByTestId("weekly-report")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("weekly-section")).toHaveCount(2);
  await expect(page.getByTestId("weekly-section").first()).toContainText("What is working");
  await expect(page.getByTestId("weekly-report")).not.toContainText("tutor scaffolding");
  await expect(page.locator('[data-testid^="fix-chip-"]')).toHaveCount(3);
  await expect(page.getByTestId("fix-chip-0")).toContainText("Kinematics: 90 minutes of graph problems");
  await expect(page.getByTestId("weekly-run")).toHaveText("Run again now");
  await shot("report");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid^="fix-chip-"]');
    await expectTapTargets(page, '[data-testid="weekly-run"]');
  }

  // what core sent the Brain: accurate mode, the analyse prompt, the student's context — and the key stayed server-side
  const seen = await brain("/__requests");
  expect(seen).toHaveLength(1);
  expect(seen[0].path).toBe("/brain/answer");
  expect(seen[0].mode).toBe("accurate");
  expect(seen[0].payload.question).toContain("Analyze this student's week");
  expect(seen[0].payload.question).toContain("STUDY TOTAL: 120 min");
  expect(seen[0].payload.subject).toBe("physics");
  expect(seen[0].payload.student_context).toHaveProperty("weak_chapters");
  expect(seen[0].payload.student_context).toHaveProperty("recent_mistakes");
  expect(toBrain, "the browser never calls the Brain").toEqual([]);
  expect(await page.content()).not.toContain(BRAIN_KEY);

  // ── it is saved: a reload shows the same report ───────────────────────────
  await page.reload();
  await expect(page.getByTestId("weekly-report")).toBeVisible();
  await expect(page.locator('[data-testid^="fix-chip-"]')).toHaveCount(3);

  // ── a chip pre-fills next week's goal ─────────────────────────────────────
  await page.getByTestId("fix-chip-0").click();
  await expect(page).toHaveURL(/\/goals\?week=next&type=HOURS&unit=MINUTES&target=90&chapter=/);
  await expect(page.getByTestId("goals-next-week")).toBeVisible();
  const drafts = page.getByTestId("goal-drafts");
  await expect(drafts).toContainText("Study 90 min");
  await expect(drafts).toContainText("Kinematics");
  await expect(page.getByTestId("goal-subject")).not.toHaveValue("");
  await shot("goal-prefilled");
  if (mobile) await noHorizontalScroll(page);
  await page.getByTestId("save-goals").click();
  await expect(page.getByRole("status").filter({ hasText: "Saved for next week" })).toBeVisible();
  await expect(page).toHaveURL(/\/goals$/);

  const saved = await page.evaluate(async (base) => {
    const headers = { authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` };
    const current = (await (await fetch(`${base}/api/goals/current`, { headers })).json()).data;
    const next = new Date(`${current.weekStart}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    const week = (await (await fetch(`${base}/api/goals/week/${next.toISOString().slice(0, 10)}`, { headers })).json()).data;
    return { thisWeek: current.goals.length, nextWeek: week.goals.map((g: { type: string; target: number; unit: string; chapterId: string | null }) => ({ type: g.type, target: g.target, unit: g.unit, hasChapter: g.chapterId !== null })) };
  }, CORE);
  expect(saved.thisWeek, "the chip did not touch this week's goals").toBe(0);
  expect(saved.nextWeek).toEqual([{ type: "HOURS", target: 90, unit: "MINUTES", hasChapter: true }]);

  // ── the Brain is down: AI resting, and the last good report stays ───────────
  await brain("/__mode", { fail: true, delayMs: 100 });
  await page.goto("/analytics/week");
  await expect(page.getByTestId("weekly-report")).toBeVisible();
  await page.getByTestId("weekly-run").click();
  await expect(page.getByTestId("weekly-failed")).toContainText("AI is resting", { timeout: 60_000 });
  await expect(page.getByTestId("weekly-report")).toBeVisible();
  await expect(page.getByTestId("weekly-report-label")).toContainText("latest finished");
  await expect(page.getByTestId("weekly-run")).toBeEnabled();
  await shot("resting");
  if (mobile) await noHorizontalScroll(page);

  // ── the daily limit: three runs, then the button waits ────────────────────
  await brain("/__mode", { fail: false, delayMs: 300 });
  await page.getByTestId("weekly-run").click();
  await expect(page.getByTestId("weekly-failed")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId("weekly-report-label")).not.toContainText("latest finished");
  await expect(page.getByTestId("weekly-limit")).toBeVisible();
  await expect(page.getByTestId("weekly-limit")).toContainText("Try again in about");
  await expect(page.getByTestId("weekly-run")).toBeDisabled();
  await shot("limit");

  // the server enforces it too, not only the button
  const over = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/diagnosis/weekly/run`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` },
      body: "{}",
    });
    return { status: res.status, body: await res.json() };
  }, CORE);
  expect(over.status).toBe(429);
  expect(JSON.stringify(over.body)).not.toContain(BRAIN_KEY);
});
