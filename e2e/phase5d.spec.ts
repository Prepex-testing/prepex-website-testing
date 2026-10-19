import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Phase 5D — the anytime 30-day diagnosis: "Diagnose me now" on Analytics, the streaming page, past diagnoses, the daily
 * limit. Runs against the FAKE Brain (e2e/fake-brain.mjs on :4999, which streams /brain/answer/stream the way the real
 * one does); core-service must be started with BRAIN_BASE_URL=http://127.0.0.1:4999 and BRAIN_API_KEY=e2e-brain-key.
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const BRAIN = process.env.E2E_FAKE_BRAIN_URL ?? "http://127.0.0.1:4999";

async function brain(p: string, body?: unknown) {
  const res = await fetch(`${BRAIN}${p}`, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
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
        body: JSON.stringify({ subjectId: chapter.subjectId, chapterId: chapter.chapterId, durationMinutes: minutes, loggedAt: new Date(Date.now() - 3_600_000).toISOString() }),
      });
      return res.status;
    },
    { base: CORE, chapterName, minutes },
  );
  expect(status, `logging ${minutes} minutes of ${chapterName}`).toBe(201);
}

async function startViaApi(page: Page) {
  return page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/diagnosis-reports`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` }, body: "{}" });
    return { status: res.status, body: await res.json() };
  }, CORE);
}

test("5D: Diagnose me now → skeleton → the report writes itself → five sections + Save to goals → past list; Brain drops mid-stream → AI resting → Try again; the daily limit", async ({ page }, info) => {
  test.setTimeout(420_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-5d-${name}.png`, fullPage: false });

  await brain("/__reset", {});
  await brain("/__mode", { delayMs: 9000, streamDelayMs: 500 });
  resetStudent();
  await onboardAndEnterApp(page);
  await logStudy(page, "Kinematics", 90);

  // warm the routes the test goes through: in `next dev` the first visit compiles the page, which can take longer than the report takes to write
  await page.goto("/diagnosis");
  await page.goto("/diagnosis/00000000-0000-4000-8000-000000000000");
  await expect(page.getByTestId("diagnosis-load-error")).toBeVisible();

  // ── the card on Analytics ──────────────────────────────────────────────────────────────────────
  await page.goto("/analytics");
  await expect(page.getByTestId("diagnose-card")).toBeVisible();
  await expect(page.getByTestId("diagnose-remaining")).toContainText("3 diagnoses left today, resets at midnight IST");
  await shot("card");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="diagnose-card"] button, [data-testid="diagnose-card"] a');
  }

  // ── start: straight to the report page, which waits ───────────────────────────────────────────
  await page.getByTestId("diagnose-now").click();
  await page.waitForURL(/\/diagnosis\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("report-skeleton")).toContainText("Reading your last 30 days…");
  await shot("reading");
  if (mobile) await noHorizontalScroll(page);

  // ── it starts writing: only OUR sections show, the text grows, then it finishes ───────────────
  const card = page.getByTestId("report-card");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-status", "streaming");
  await expect(page.getByTestId("report-label")).toHaveText("Writing your report…");
  const early = (await card.textContent())!.length;
  await expect.poll(async () => (await card.textContent())!.length, { timeout: 30_000 }).toBeGreaterThan(early + 40);
  await expect(card).not.toContainText("tutor scaffolding");
  await expect(card).not.toContainText("Short answer");
  await shot("writing");
  if (mobile) await noHorizontalScroll(page);

  await expect(card).toHaveAttribute("data-status", "complete", { timeout: 60_000 });
  await expect(page.getByTestId("report-label")).toContainText("Your last 30 days");
  await expect(page.getByTestId("report-section").locator("h2")).toHaveText(["Strengths", "Bleeding chapters", "Revision debt", "Mock trajectory", "30-day action plan"]);
  await expect(card).not.toContainText("JEE traps");
  await expect(card).not.toContainText("Keep going");
  await expect(page.getByTestId("report-caret")).toHaveCount(0);

  // ── the plan: a card per week, Save to goals carries the week, the chapter and the hours ──────
  await expect(page.getByTestId("plan-items").locator("li")).toHaveCount(4);
  await expect(page.getByTestId("save-goal-0")).toHaveAttribute("href", /week=current&type=HOURS&unit=MINUTES&target=360&chapter=[0-9a-f-]{36}/);
  await expect(page.getByTestId("save-goal-1")).toHaveAttribute("href", /week=next&type=HOURS&unit=MINUTES&target=270&chapter=[0-9a-f-]{36}/);
  await expect(page.getByTestId("save-goal-3")).toHaveAttribute("href", /week=plus3&/);
  await page.getByTestId("plan-items").scrollIntoViewIfNeeded();
  await shot("done");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="plan-items"] a');
  }

  // what the Brain was asked: the stream endpoint, the strict contract, fast
  const seen = (await brain("/__requests")) as { path: string; mode: string; payload: { question: string; context: Record<string, unknown>; max_tokens: number; language: string } }[];
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatchObject({ path: "/brain/answer/stream", mode: "fast" });
  expect(Object.keys(seen[0]!.payload).sort()).toEqual(["context", "language", "max_tokens", "question"]);
  expect(seen[0]!.payload.question).toContain("## 30-DAY ACTION PLAN");
  expect(Object.keys(seen[0]!.payload.context).sort()).toEqual(["notes", "recent_mistakes", "weak_chapters"]);

  // Save to goals opens the goals page with that goal ready for this week
  await page.getByTestId("save-goal-0").click();
  await page.waitForURL(/\/goals\?week=current/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // ── past diagnoses ────────────────────────────────────────────────────────────────────────────
  await page.goto("/diagnosis");
  await expect(page.getByTestId("diagnosis-item")).toHaveCount(1);
  await expect(page.getByTestId("diagnosis-item").first()).toContainText("Finished");
  await expect(page.getByTestId("diagnosis-item").first()).toContainText("You studied on 22 of 30 days");
  await expect(page.getByTestId("diagnose-remaining")).toContainText("2 diagnoses left today");
  await shot("list");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="diagnosis-item"], [data-testid="diagnose-now"]');
  }

  // ── the Brain drops mid-stream: AI resting, nothing half-written, and it did not use one up ────
  await brain("/__mode", { streamFailAfter: 4, delayMs: 200, streamDelayMs: 150 });
  await page.getByTestId("diagnose-now").click();
  await page.waitForURL(/\/diagnosis\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("report-resting")).toContainText("AI resting, please try again in a few minutes.", { timeout: 60_000 });
  await expect(page.getByTestId("report-card")).toHaveCount(0);
  await shot("resting");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="report-resting"] button, [data-testid="report-resting"] a');
  }
  await page.goto("/diagnosis");
  await expect(page.getByTestId("diagnose-remaining")).toContainText("2 diagnoses left today"); // the failed run is free
  await expect(page.getByTestId("diagnosis-item").first()).toContainText("AI was resting");

  // ── Try again, with the Brain back: it works ──────────────────────────────────────────────────
  await brain("/__mode", { streamFailAfter: null, delayMs: 200, streamDelayMs: 40 });
  await page.getByTestId("diagnosis-item").first().click();
  await expect(page.getByTestId("report-resting")).toBeVisible();
  await page.getByTestId("report-retry").click();
  await page.waitForURL(/\/diagnosis\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("report-card")).toHaveAttribute("data-status", "complete", { timeout: 60_000 });

  // ── the daily limit: the third is the last; then the card says so and the server refuses ──────
  const third = await startViaApi(page);
  expect(third.status).toBe(202);
  await expect.poll(async () => page.evaluate(async ({ base, id }) => (await (await fetch(`${base}/api/diagnosis-reports/${id}`, { headers: { authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` } })).json()).data.report.status, { base: CORE, id: third.body.data.report.id }), { timeout: 60_000 }).toBe("complete");
  const fourth = await startViaApi(page);
  expect(fourth.status).toBe(429);
  expect(fourth.body.message).toContain("midnight IST");
  await page.goto("/analytics");
  await expect(page.getByTestId("diagnose-remaining")).toContainText("No diagnoses left today. They reset at midnight IST.");
  await expect(page.getByTestId("diagnose-now")).toBeDisabled();
  await shot("limit");
  if (mobile) await noHorizontalScroll(page);
});
