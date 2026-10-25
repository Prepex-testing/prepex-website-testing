import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, noHorizontalScroll, onboardAndEnterApp, resetStudent } from "./helpers";

/**
 * Phase 5C — the AI weekly goal assistant on the Goals page. Runs against the FAKE Brain (e2e/fake-brain.mjs on :4999);
 * core-service must be started with BRAIN_BASE_URL=http://127.0.0.1:4999 and BRAIN_API_KEY=e2e-brain-key.
 */
test.describe.configure({ mode: "serial" });

const CORE = process.env.E2E_CORE_URL ?? "http://localhost:4002";
const BRAIN = process.env.E2E_FAKE_BRAIN_URL ?? "http://127.0.0.1:4999";

async function brain(p: string, body?: unknown) {
  const res = await fetch(`${BRAIN}${p}`, body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

/** A QUESTIONS goal on a chapter, made through the API, so the page has a goal row with a ✨ Suggest button. */
async function addQuestionsGoal(page: Page, chapterName: string) {
  const status = await page.evaluate(
    async ({ base, chapterName }) => {
      const headers = { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` };
      const syllabus = await (await fetch(`${base}/api/syllabus`, { headers })).json();
      const chapter = (syllabus.data.subjects as { chapters: { chapterId: string; name: string; subjectId: number }[] }[]).flatMap((s) => s.chapters).find((c) => c.name === chapterName);
      if (!chapter) return 404;
      const res = await fetch(`${base}/api/goals`, {
        method: "POST",
        headers,
        body: JSON.stringify({ subjectId: chapter.subjectId, chapterId: chapter.chapterId, type: "QUESTIONS", target: 40, unit: "COUNT" }),
      });
      return res.status;
    },
    { base: CORE, chapterName },
  );
  expect(status, `adding a questions goal on ${chapterName}`).toBe(201);
}

async function chooseChapter(page: Page, name: string) {
  const options = await page.getByTestId("suggest-chapter").locator("option").allTextContents();
  expect(options, `the chapter list offers "${name}"`).toContain(name);
  await page.getByTestId("suggest-chapter").selectOption({ label: name });
}

test("5C: ✨ Suggest on a goal row → skeleton → card → Modify → goal; + Suggest new goal → Accept; Brain down → AI resting → Try again → Dismiss; rate limit", async ({ page }, info) => {
  test.setTimeout(420_000);
  const mobile = info.project.name.startsWith("mobile");
  const shot = (name: string) => page.screenshot({ path: `e2e/.shots/${info.project.name}-5c-${name}.png` });

  await brain("/__reset", {});
  await brain("/__mode", { delayMs: 1200 });
  resetStudent();
  await onboardAndEnterApp(page);
  await addQuestionsGoal(page, "Kinematics");

  // ── the row button: skeleton while the Brain thinks, then the suggestion ──────────────────────
  await page.goto("/goals");
  await expect(page.getByTestId("goal-card")).toHaveCount(1);
  await page.getByTestId("goal-menu").click();
  await page.getByTestId("goal-suggest").click();
  await expect(page.getByTestId("suggest-skeleton")).toBeVisible();
  await shot("skeleton");
  const card = page.getByTestId("suggest-card");
  await expect(card).toBeVisible();
  await expect(page.getByTestId("suggest-skeleton")).toHaveCount(0);
  await expect(page.getByTestId("suggest-hours")).toContainText("4 hours this week");
  await expect(page.getByTestId("suggest-subtopics").locator("li")).toHaveCount(3);
  await expect(page.getByTestId("suggest-pyq")).toContainText("2019");
  await expect(page.getByTestId("suggest-why")).not.toBeEmpty();
  await expect(card).not.toContainText("Tutor preamble"); // the tutor template around the answer never reaches the student
  await shot("card");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="suggest-card"] button');
  }

  // what the Brain was asked: fast mode, the strict contract (no `subject`), this chapter only
  const seen = (await brain("/__requests")) as { path: string; mode: string; payload: { question: string; context: Record<string, unknown>; language: string } }[];
  expect(seen).toHaveLength(1);
  expect(seen[0]!.mode).toBe("fast");
  expect(Object.keys(seen[0]!.payload).sort()).toEqual(["context", "language", "question"]);
  expect(seen[0]!.payload.question).toContain("Student wants to set this week's goal for Kinematics.");
  expect(Object.keys(seen[0]!.payload.context).sort()).toEqual(["notes", "recent_mistakes", "weak_chapters"]);

  // ── Modify: the student's own hours become the goal ───────────────────────────────────────────
  await page.getByTestId("suggest-modify").click();
  await page.getByTestId("suggest-hours-input").fill("16");
  await expect(page.getByTestId("suggest-save-modified")).toBeDisabled();
  await page.getByTestId("suggest-hours-input").fill("6.5");
  await page.getByTestId("suggest-save-modified").click();
  await expect(page.getByTestId("suggest-card")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Added: 6.5 hours on Kinematics" })).toBeVisible();
  await expect(page.getByTestId("goal-card")).toHaveCount(2);
  await expect(page.getByTestId("goal-sections")).toContainText("6h 30m focused study");
  await shot("after-modify");

  // ── + Suggest new goal: pick a chapter, Accept ────────────────────────────────────────────────
  await page.getByTestId("suggest-new").click();
  await expect(page.getByTestId("suggest-go")).toBeDisabled();
  await chooseChapter(page, "Laws of Motion");
  await page.getByTestId("suggest-go").click();
  await expect(page.getByTestId("suggest-card")).toBeVisible();
  await expect(page.getByTestId("suggest-card")).toContainText("Laws of Motion");
  await page.getByTestId("suggest-accept").click();
  await expect(page.getByTestId("suggest-card")).toHaveCount(0);
  await expect(page.getByTestId("goal-sections")).toContainText("4h focused study");
  await expect(page.getByTestId("goal-card")).toHaveCount(3);

  // ── the Brain is down: "AI is resting", nothing invented; Try again recovers ──────────────────
  await brain("/__mode", { fail: true, delayMs: 100 });
  await chooseChapter(page, "Work, Energy and Power");
  await page.getByTestId("suggest-go").click();
  const err = page.getByTestId("suggest-error");
  await expect(err).toContainText("AI is resting, back soon.");
  await expect(page.getByTestId("suggest-card")).toHaveCount(0);
  await shot("resting");
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="suggest-error"] button');
  }
  await brain("/__mode", { fail: false, delayMs: 300 });
  await page.getByTestId("suggest-retry").click();
  await expect(page.getByTestId("suggest-card")).toBeVisible();

  // ── Dismiss: gone, and no goal was added ──────────────────────────────────────────────────────
  await page.getByTestId("suggest-dismiss").click();
  await expect(page.getByTestId("suggest-card")).toHaveCount(0);
  await expect(page.getByTestId("goal-card")).toHaveCount(3);

  // ── the hourly limit: the server says how many minutes, and there is no Try again ─────────────
  const statuses = await page.evaluate(
    async ({ base }) => {
      const headers = { "content-type": "application/json", authorization: `Bearer ${localStorage.getItem("prepex_access_token")}` };
      const syllabus = await (await fetch(`${base}/api/syllabus`, { headers })).json();
      const chapterId = (syllabus.data.subjects as { chapters: { chapterId: string }[] }[]).flatMap((s) => s.chapters)[0]!.chapterId;
      const out: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await fetch(`${base}/api/goal-suggestions`, { method: "POST", headers, body: JSON.stringify({ chapterId }) });
        out.push(res.status);
        if (res.status === 429) break;
      }
      return out;
    },
    { base: CORE },
  );
  expect(statuses[statuses.length - 1], JSON.stringify(statuses)).toBe(429);
  await chooseChapter(page, "Work, Energy and Power");
  await page.getByTestId("suggest-go").click();
  await expect(page.getByTestId("suggest-error")).toContainText(/Try again in about \d+ minute/);
  await expect(page.getByTestId("suggest-retry")).toHaveCount(0);
  await shot("limit");
  if (mobile) await noHorizontalScroll(page);
});
