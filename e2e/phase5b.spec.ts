import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Phase 5B — the daily AI insight on Home. Runs against the FAKE Brain (e2e/fake-brain.mjs on :4999); core-service must
 * be started with BRAIN_BASE_URL=http://127.0.0.1:4999 and BRAIN_API_KEY=e2e-brain-key. The 22:30 job is run once, now,
 * by e2e/run-daily-insight.mts (the cron itself waits for 22:30 IST).
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const BRAIN = process.env.E2E_FAKE_BRAIN_URL ?? "http://127.0.0.1:4999";
const BACKEND = process.env.E2E_BACKEND_DIR ?? path.resolve(__dirname, "../../prepex-backend-testing");

async function brain(p: string, body?: unknown) {
  const res = await fetch(`${BRAIN}${p}`, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

/** Runs the daily job once; returns what it reported. */
function runDailyJob(): { students: number; ready: number; failed: number; skipped: number } {
  const out = execFileSync("npx", ["tsx", path.resolve(__dirname, "run-daily-insight.mts"), BACKEND], {
    cwd: path.join(BACKEND, "services/core-service"),
    env: { ...process.env, BRAIN_BASE_URL: BRAIN, BRAIN_API_KEY: "e2e-brain-key" },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const line = out.trim().split("\n").filter((l) => l.startsWith("{")).pop();
  return JSON.parse(line ?? "{}");
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

async function insightState(page: Page) {
  return page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/insights/daily`, { headers: { authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` } });
    return (await res.json()).data as { insight: { id: string; feedback: string | null } | null; resting: boolean };
  }, CORE);
}

test("5B: no card on a zero-activity day → activity + the 22:30 job → card above the planner → thumbs; Brain down → AI resting", async ({ page }, info) => {
  test.setTimeout(300_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-5b-${name}.png` });

  await brain("/__reset", {});
  resetStudent();
  await onboardAndEnterApp(page);

  // ── zero-activity day: nothing on Home, and the job makes no Brain call for this student ──
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("insight-card")).toHaveCount(0);
  await expect(page.getByTestId("insight-resting")).toHaveCount(0);
  runDailyJob();
  const idle = (await brain("/__requests")) as unknown[];
  expect(idle.length, "the job spent no Brain call on a student with no activity").toBe(0);

  // ── a day's activity, then the 22:30 job ───────────────────────────────────
  await logStudy(page, "Kinematics", 120);
  await brain("/__mode", { delayMs: 300 });
  const ran = runDailyJob();
  expect(ran.ready, JSON.stringify(ran)).toBeGreaterThanOrEqual(1);
  const seen = (await brain("/__requests")) as { path: string; mode: string; payload: { question: string; subject: string } }[];
  expect(seen).toHaveLength(1);
  expect(seen[0]!.mode).toBe("fast");
  expect(seen[0]!.payload.question).toContain("One honest observation about today. One nudge for tomorrow. 50 words max each.");
  expect(seen[0]!.payload.question).toContain("TODAY (IST");
  expect(Object.keys(seen[0]!.payload).sort()).toEqual(["question", "subject"]);

  // ── the card is on Home, right under today's plan (planner v2 order: greeting, check-in, plan, insight) ──
  await page.goto("/home");
  const card = page.getByTestId("insight-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("insight-observation")).toContainText("120 minutes today");
  await expect(page.getByTestId("insight-nudge")).toContainText("20 minutes on the Kinematics graph mistakes");
  await expect(card).not.toContainText("Tutor preamble");
  const above = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="insight-card"]')!.getBoundingClientRect().top;
    const plan = document.querySelector('[data-testid="today-plan-card"]')!.getBoundingClientRect().top;
    const quick = document.querySelector('[data-testid="quick-access"]')!.getBoundingClientRect().top;
    return c > plan && (quick > c || quick < plan);
  });
  expect(above, "the insight sits below today's plan and before the weekly strip / quick access on a phone").toBe(true);
  await shot("card");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="insight-card"] button');
  }

  // ── × hides it for now but it is not read: it comes back on the next load of the API ──
  await page.getByTestId("insight-later").click();
  await expect(page.getByTestId("insight-card")).toHaveCount(0);
  expect((await insightState(page)).insight, "snoozing is not reading").not.toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("insight-card")).toHaveCount(0); // still snoozed on this device today
  await page.evaluate(() => localStorage.removeItem("prepex_insight_later"));
  await page.reload();
  await expect(page.getByTestId("insight-card")).toBeVisible(); // "resurfaces until read"

  // ── thumbs up: saved, counts as read, the card gives way ──────────────────
  await page.getByTestId("insight-up").click();
  await expect(page.getByTestId("insight-thanks")).toContainText("glad it helped");
  await expect(page.getByTestId("insight-card")).toHaveCount(0);
  expect((await insightState(page)).insight).toBeNull();
  const stored = await page.evaluate(async (base) => {
    // the row keeps the thumb even though it no longer shows
    const res = await fetch(`${base}/api/insights/daily`, { headers: { authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` } });
    return res.status;
  }, CORE);
  expect(stored).toBe(200);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("insight-card")).toHaveCount(0);
  await shot("after-thumb");
});

test("5B: the Brain is down → 'AI resting, back soon' → it recovers on the retry", async ({ page }, info) => {
  test.setTimeout(300_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-5b-${name}.png` });

  await brain("/__reset", {});
  resetStudent();
  await onboardAndEnterApp(page);
  await logStudy(page, "Kinematics", 60);

  await brain("/__mode", { fail: true, delayMs: 50 });
  const ran = runDailyJob();
  expect(ran.failed, JSON.stringify(ran)).toBeGreaterThanOrEqual(1);

  await page.goto("/home");
  await expect(page.getByTestId("insight-resting")).toContainText("AI resting, back soon.");
  await expect(page.getByTestId("insight-card")).toHaveCount(0);
  await shot("resting");
  if (mobile) await noHorizontalScroll(page);

  // the next run (the 23:00 retry runs the same job) finds it done
  await brain("/__mode", { fail: false, delayMs: 100 });
  runDailyJob();
  await page.reload();
  await expect(page.getByTestId("insight-card")).toBeVisible();
  await expect(page.getByTestId("insight-resting")).toHaveCount(0);

  // thumbs down + "Got it" path
  await page.getByTestId("insight-down").click();
  await expect(page.getByTestId("insight-thanks")).toBeVisible();
});
