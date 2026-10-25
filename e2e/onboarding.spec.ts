import { expect, test, type Page } from "@playwright/test";
import { expectTapTargets, login, next, noHorizontalScroll, queryDb, reachTimetableStep, resetStudent } from "./helpers";

/**
 * Onboarding v2, end to end against the real stack: five steps, one save at the end.
 *
 *   1 goal -> 2 exam date + class -> 3 coaching -> 4 timetable -> 5 chapters
 */

test.describe.configure({ mode: "serial" });

const STUDENT = "e2e.student@test.prepex.io";

async function trackedEvents(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __events: unknown[] }).__events = [];
    window.addEventListener("prepex:track", (e) => (window as unknown as { __events: unknown[] }).__events.push((e as CustomEvent).detail));
  });
}
const events = (page: Page) => page.evaluate(() => (window as unknown as { __events: { event: string; stepNumber: number; stepName: string }[] }).__events);

test("a coaching student who is preparing for the full JEE journey (Main + Advanced): every step, the toggle, the draft, and the single save", async ({ page }, info) => {
  const mobile = info.project.name.startsWith("mobile");
  resetStudent();
  await trackedEvents(page);
  await login(page);

  // ── Step 1: goal ─────────────────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: /Back/ })).toHaveCount(0); // the first step has no Back
  const options = await page.locator("main button").filter({ hasText: /JEE|NEET/ }).allInnerTexts();
  const names = options.map((t) => t.split("\n")[0]);
  expect(names).toEqual(["JEE Main", "JEE Advanced", "Both JEE Main + Advanced", "NEET"]);
  await page.getByRole("button", { name: /Both JEE Main \+ Advanced/ }).click();
  await expect(page.getByRole("button", { name: /Both JEE Main \+ Advanced/ })).toHaveClass(/border-ink/);
  await expect(page.getByRole("button", { name: /^JEE Main/ })).not.toHaveClass(/border-ink/);
  await next(page);

  // ── Step 2: about you ────────────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByPlaceholder("Rohan Sharma").fill("");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled(); // a name is needed
  await page.getByPlaceholder("Rohan Sharma").fill("Aarav E2E");
  await page.getByPlaceholder("City").fill("Bhopal");
  await page.getByText("Class 12", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await next(page);

  // ── Step 3: coaching ─────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/where-do-you-study/);
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await expect(page.getByText(/Got a schedule screenshot/)).toHaveCount(0); // no uploads in onboarding
  await page.getByText("Yes, I attend coaching").click();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled(); // which coaching?
  await page.getByLabel("Coaching name").selectOption({ label: "Allen Career Institute" });
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await next(page);

  // ── Step 4: timetable ────────────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  // The coaching + class answers picked School + Coaching and loaded it before the screen appeared.
  await expect(page.getByTestId("template-note")).toContainText("School + Coaching");
  await expect(page.getByTestId("template-SCHOOL_COACHING")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("template-legend")).toBeVisible();
  const marked = page.locator('[data-testid="tt-block"][data-from-template="true"]');
  expect(await marked.count()).toBeGreaterThan(5);
  // School + Coaching differs by day, so it opens with each day separate.
  await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "false");
  expect(await page.locator('[data-testid^="day-col-"]').count()).toBe(mobile ? 1 : 7);
  if (mobile) {
    await noHorizontalScroll(page);
    await expectTapTargets(page, '[data-testid="uniform-toggle"]');
  }

  // Flip to "same every day": a confirm modal says what will happen, and cancelling changes nothing.
  await page.getByTestId("uniform-toggle").click();
  await expect(page.getByTestId("uniform-modal")).toContainText("Switching will copy Monday's plan to all 7 days");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "false");
  await page.getByTestId("uniform-toggle").click();
  await page.getByTestId("uniform-confirm").click();
  await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('[data-testid^="day-col-"]')).toHaveCount(1);
  await expect(page.getByText("Every day", { exact: true })).toBeVisible();

  // Editing the one day edits them all: remove a block and it is gone from every day.
  const before = await page.getByTestId("tt-block").count();
  await page.getByTestId("tt-block").nth(2).focus();
  await page.keyboard.press("Delete");
  await expect(page.getByTestId("tt-block")).toHaveCount(before - 1);

  // The draft survives a reload, toggle and all.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Build your week" })).toBeVisible();
  await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("tt-block")).toHaveCount(before - 1);
  await page.getByTestId("save-timetable").click();

  // ── Step 5: chapters ─────────────────────────────────────────────────────────
  await expect(page.getByRole("heading", { name: "Which chapters have you finished?" })).toBeVisible();
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  const counter = page.getByTestId("chapter-counter");
  await expect(counter).toContainText(/^0 of \d+ chapters complete$/);
  // Main + Advanced is Physics, Chemistry and Maths in both classes: no Biology.
  await expect(page.getByRole("heading", { name: "Class 11" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Class 12" })).toBeVisible();
  await page.getByLabel("Search chapters").fill("biology");
  await expect(page.getByText(/No chapter matches/)).toBeVisible();
  await page.getByLabel("Search chapters").fill("");
  const subjectNames = await page.locator("button[aria-expanded] span.font-bold").allInnerTexts();
  expect(subjectNames.length).toBeGreaterThan(0);
  expect(subjectNames.every((n) => ["Physics", "Chemistry", "Maths"].includes(n))).toBe(true);

  // Selected chapters are never green.
  await page.getByTestId("chapter-chip").first().click();
  const selectedStyle = await page.getByTestId("chapter-chip").first().evaluate((el) => {
    const css = getComputedStyle(el);
    return { background: css.backgroundColor, border: css.borderTopColor };
  });
  const [, r = 0, g = 0, b = 0] = selectedStyle.background.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)?.map(Number) ?? [];
  expect(g > r + 24 && g > b + 24).toBe(false);
  await page.getByTestId("chapter-chip").first().click();

  // One tap marks a chapter complete; a second tap clears it. There is no partial state.
  const first = page.getByTestId("chapter-chip").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(counter).toContainText(/^1 of \d+ chapters complete$/);
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "false");

  // "Mark all complete" finishes a whole subject in one tap.
  const subject = page.getByTestId(/^subject-11-/).first();
  const subjectTotal = await subject.getByTestId("chapter-chip").count();
  await subject.getByTestId("mark-all").click();
  await expect(counter).toContainText(`${subjectTotal} of`);
  await expect(subject.getByTestId("mark-all")).toHaveText("Unmark all");
  if (mobile) await expectTapTargets(page, '[data-testid="chapter-chip"]');

  // Search filters live across classes and subjects.
  await page.getByLabel("Search chapters").fill("zzzz");
  await expect(page.getByText(/No chapter matches/)).toBeVisible();
  await page.getByLabel("Search chapters").fill("");

  // The ticks survive a reload.
  await page.reload();
  await expect(page.getByTestId("chapter-counter")).toContainText(`${subjectTotal} of`);

  await next(page);
  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 90_000 });

  // ── What was saved, in one piece ─────────────────────────────────────────────
  const [profile] = queryDb<{
    target_exams: string[];
    timetable_uniform_week: boolean;
    current_level: string;
    coaching_type: string;
    coaching_name: string;
    weekday_hours: number;
    weekly_study_minutes: number;
  }>(
    `select p.target_exams, p.timetable_uniform_week, p.current_level, p.coaching_type, p.coaching_name, p.weekday_hours, p.weekly_study_minutes
       from core.user_profiles p join core.users u on u.id = p.user_id where u.email = $1`,
    [STUDENT],
  );
  expect(profile!.target_exams).toEqual(["JEE_MAIN", "JEE_ADVANCED"]);
  expect(profile!.timetable_uniform_week).toBe(true);
  expect(profile!.current_level).toBe("CLASS_12");
  expect(profile!.coaching_type).toBe("COACHING");
  expect(profile!.coaching_name).toBe("Allen Career Institute");
  expect(profile!.weekly_study_minutes).toBeGreaterThan(0);

  const subjects = queryDb<{ subject_id: number }>(
    `select s.subject_id from core.user_profile_subjects s join core.user_profiles p on p.id = s.profile_id join core.users u on u.id = p.user_id where u.email = $1 order by 1`,
    [STUDENT],
  );
  expect(subjects).toHaveLength(3); // Physics, Chemistry and Maths: no Biology for JEE

  const statuses = queryDb<{ status: string; onboarding: boolean; revision_phase: string; n: string }>(
    `select c.status, c.onboarding, c.revision_phase, count(*) n from core.user_chapter_progress c join core.users u on u.id = c.user_id where u.email = $1 group by 1,2,3 order by 1`,
    [STUDENT],
  );
  const revision = statuses.find((r) => r.status === "IN_REVISION")!;
  expect(Number(revision.n)).toBe(subjectTotal);
  expect(revision).toMatchObject({ onboarding: true, revision_phase: "ONBOARDING" }); // in the revision queue, flagged as onboarding
  expect(statuses.some((r) => r.status === "LEARNING")).toBe(false); // there is no partial state

  const studied = queryDb<{ n: string }>(
    `select count(*) n from core.chapter_progress c join core.users u on u.id = c.user_id where u.email = $1 and c.theory_status = 'studied'`,
    [STUDENT],
  );
  expect(Number(studied[0]!.n)).toBe(subjectTotal); // and shown as studied in the syllabus overview

  const done = queryDb<{ is_completed: boolean }>(
    `select o.is_completed from core.onboarding_progress o join core.users u on u.id = o.user_id where u.email = $1`,
    [STUDENT],
  );
  expect(done[0]!.is_completed).toBe(true);

  // ── Telemetry: one view and one completion per step, with a number and a name ─
  const seen = await events(page).catch(() => []);
  // (the page navigated several times, so only the last document's events are still in memory)
  for (const e of seen) {
    expect(["onboarding_step_view", "onboarding_step_complete"]).toContain(e.event);
    expect(typeof e.stepNumber).toBe("number");
    expect(e.stepName).toBeTruthy();
  }
});

test("a self-prep student: the toggle starts on, one day builds the whole week, and a week with no study time is refused", async ({ page }) => {
  resetStudent();
  await reachTimetableStep(page);

  // Self-prep gets the Self-Prep week, which is the same every day, so the toggle is on with one editor.
  await expect(page.getByTestId("template-note")).toContainText("Self-Prep Only");
  await expect(page.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('[data-testid^="day-col-"]')).toHaveCount(1);
  await expect(page.getByTestId("sleep-warning")).toHaveCount(0);

  // Remove everything and the week is refused with a message that says what to do.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByTestId("save-timetable")).toBeDisabled();

  // Practice only (no self-study) is still enough; revision alone is not.
  await page.getByTestId("template-SELF_PREP").click();
  await expect(page.getByTestId("save-timetable")).toBeEnabled();
  await expect(page.getByTestId("planning-time-error")).toHaveCount(0);

  // Going back keeps the answers.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/where-do-you-study/);
  await expect(page.getByText("Self-prep only")).toBeVisible();
  await next(page);
  await expect(page.getByTestId("tt-block").first()).toBeVisible();
});

test("the chapter step can be skipped with nothing marked, and the student is still fully onboarded", async ({ page }) => {
  resetStudent();
  await reachTimetableStep(page);
  await next(page);
  await expect(page).toHaveURL(/which-chapters-have-you-studied/);
  await page.getByTestId("skip-chapters").click();
  await expect(page).toHaveURL(/welcome-to-prepex/, { timeout: 90_000 });

  const rows = queryDb<{ status: string }>(
    `select c.status from core.user_chapter_progress c join core.users u on u.id = c.user_id where u.email = $1`,
    [STUDENT],
  );
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((r) => r.status === "NOT_STARTED")).toBe(true); // still to learn: the planner may teach them
});

test("visiting a later step directly sends the student back to the first one that is missing something", async ({ page }) => {
  resetStudent();
  await login(page);
  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible({ timeout: 60_000 });
  await page.goto("/onboarding/which-chapters-have-you-studied");
  await expect(page.getByRole("heading", { name: /I.m preparing for/ })).toBeVisible();
});
