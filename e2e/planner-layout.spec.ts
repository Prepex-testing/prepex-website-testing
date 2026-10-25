import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { stubPlannerApi } from "./stubs/plannerStubs";

/**
 * How Home and the full plan are laid out, checked in a real browser against a stubbed API (no backend, no account).
 * Set PLANNER_SHOTS_DIR to also save full-page screenshots in light and dark.
 */

const SHOTS = process.env.PLANNER_SHOTS_DIR;

/** Every visible button or link filled with the call-to-action coral. Switches are controls, not calls to action. */
async function coralFilled(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--cta)";
    document.body.appendChild(probe);
    const coral = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return [...document.querySelectorAll<HTMLElement>("button, a")]
      .filter((el) => el.offsetParent !== null && el.getAttribute("role") !== "switch" && getComputedStyle(el).backgroundColor === coral)
      .map((el) => (el.getAttribute("data-testid") ?? el.textContent ?? el.tagName).trim().slice(0, 40));
  });
}

async function open(page: Page, route: string, theme: "light" | "dark" = "light") {
  await page.emulateMedia({ colorScheme: theme });
  await stubPlannerApi(page, theme);
  await page.goto(route);
}

test.describe("Home", () => {
  test("the plan flows on the page as a timeline of rich cards and dim bands, with outlined buttons", async ({ page }) => {
    await open(page, "/home");
    const plan = page.getByTestId("home-plan");
    await expect(plan).toBeVisible();

    // no card around the planner
    const wrapper = await plan.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopWidth, shadow: s.boxShadow, background: s.backgroundColor };
    });
    expect(wrapper.border).toBe("0px");
    expect(wrapper.shadow).toBe("none");

    await expect(page.getByTestId("plan-explanation")).toBeVisible();
    await expect(page.getByTestId("timeline")).toBeVisible();
    await expect(page.getByTestId("study-task").first()).toBeVisible();
    expect(await page.getByTestId("study-task").count()).toBe(6);
    // the slots between the first and last study task show as dim bands
    expect(await page.getByTestId("slot-band").count()).toBeGreaterThan(0);

    // every card shows what to do
    const first = page.getByTestId("study-task").first();
    for (const id of ["chip-subject", "chip-type", "chip-status", "task-chapter", "task-instruction", "meta-duration", "meta-range", "meta-resource", "task-cta"]) await expect(first.getByTestId(id)).toBeVisible();

    await expect(page.getByTestId("see-full-plan")).toHaveAttribute("href", "/planner");
    await expect(page.getByTestId("weekly-progress")).toBeVisible();
    await expect(page.getByTestId("view-full-week")).toHaveAttribute("href", "/goals");
    await expect(page.getByTestId("regenerate")).toBeVisible();
    await expect(page.getByTestId("add-task")).toBeVisible();

    expect(await coralFilled(page)).toEqual([]);
  });

  test("Quick Access has nine rows, no Partner and no Analytics", async ({ page }) => {
    await open(page, "/home");
    await expect(page.getByTestId("quick-focus")).toBeVisible();
    const labels = await page.locator('[data-testid^="quick-"]').allTextContents();
    expect(labels).toHaveLength(9);
    const text = labels.join(" | ");
    for (const want of ["Focus", "Practice", "Revision", "Mistakes", "Mocks", "Where to focus next", "Leader Board", "Resource Library", "Weekly Win Journal"]) expect(text).toContain(want);
    expect(text).not.toContain("Partner");
    expect(text).not.toContain("Analytics");
    expect(text).toContain("15 unresolved");
    // the Partner link and the theme toggle stay in the top right
    await expect(page.getByTestId("home-pods")).toBeVisible();
  });

  test("nothing scrolls sideways", async ({ page }) => {
    await open(page, "/home");
    await expect(page.getByTestId("home-plan")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});

test.describe("Today's plan", () => {
  test("has no day tabs and no floating buttons; Regenerate and Add task sit at the top", async ({ page }) => {
    await open(page, "/planner");
    await expect(page.getByTestId("planner-page")).toBeVisible();
    await expect(page.getByTestId("plan-title")).toHaveText("Today's Plan");
    await expect(page.getByRole("navigation", { name: "Choose a day" })).toHaveCount(0);
    await expect(page.getByTestId("day-tab-today")).toHaveCount(0);
    for (const id of ["regenerate", "add-task"]) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.y, `${id} is inline at the top, not floating`).toBeLessThan(260);
      expect(await page.getByTestId(id).evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
    }
    expect(await coralFilled(page)).toEqual([]);
  });

  test("shows the whole day: study cards and dim slot bands, never sleep, with a Now line", async ({ page }) => {
    await open(page, "/planner");
    await expect(page.getByTestId("timeline")).toBeVisible();
    expect(await page.getByTestId("study-task").count()).toBe(6);
    const slots = await page.locator('[data-testid="slot-band"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-slot")));
    expect(slots).toEqual(["exercise", "meal", "school", "meal", "break", "exercise", "meal", "family"]);
    expect(slots).not.toContain("sleep");
    await expect(page.getByTestId("now-marker")).toBeVisible();
  });

  test("lays out for the screen: two columns with a side panel on wide screens, one column on a phone", async ({ page }, info) => {
    await open(page, "/planner");
    await expect(page.getByTestId("planner-page")).toBeVisible();
    if (info.project.name.startsWith("desktop")) {
      await expect(page.getByTestId("planner-page")).toHaveAttribute("data-layout", "two-column");
      const panel = page.getByTestId("side-panel");
      await expect(panel).toBeVisible();
      await expect(panel.getByTestId("plan-explanation")).toBeVisible();
      await expect(panel.getByTestId("weekly-progress")).toBeVisible();
      await expect(page.getByTestId("side-revisions")).toBeVisible();
      await expect(page.getByTestId("side-backlog")).toBeVisible();
      await expect(page.getByTestId("side-collapsibles")).toHaveCount(0);
      const timeline = await page.getByTestId("timeline").boundingBox();
      const side = await panel.boundingBox();
      expect(side!.x).toBeGreaterThan(timeline!.x + timeline!.width - 1); // beside the plan, not under it
    } else {
      await expect(page.getByTestId("planner-page")).toHaveAttribute("data-layout", "single-column");
      await expect(page.getByTestId("side-panel")).toHaveCount(0);
      const collapsibles = page.getByTestId("side-collapsibles");
      await expect(collapsibles).toBeVisible();
      await expect(page.getByTestId("collapsible-week")).toBeVisible();
      await expect(page.getByTestId("collapsible-revisions")).toBeVisible();
      await expect(page.getByTestId("collapsible-backlog")).toBeVisible();
      // closed until opened, and below the plan
      expect(await page.getByTestId("collapsible-revisions").evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
      const timeline = await page.getByTestId("timeline").boundingBox();
      const sections = await collapsibles.boundingBox();
      expect(sections!.y).toBeGreaterThan(timeline!.y + timeline!.height - 1);
      await page.getByTestId("collapsible-revisions").locator("summary").click();
      expect(await page.getByTestId("collapsible-revisions").evaluate((el) => (el as HTMLDetailsElement).open)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test("at 1440 the content is centred and capped at 1400, still two columns", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("desktop"), "wide screens only");
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "/planner");
    await expect(page.getByTestId("side-panel")).toBeVisible();
    const box = await page.getByTestId("planner-page").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1400);
    expect(box!.width).toBeGreaterThan(1100);
    // the page keeps its side nav, so only the content area is measured: it fills the middle with no empty corners
    const side = await page.getByTestId("side-panel").boundingBox();
    expect(side!.x + side!.width).toBeGreaterThan(1100);
  });

  test("a study card's menu offers Mark done, Skip, Reschedule and Delete", async ({ page }) => {
    await open(page, "/planner");
    await page.getByTestId("study-task").first().getByTestId("task-menu").click();
    await expect(page.getByRole("menuitem")).toHaveText(["Mark done", "Skip", "Reschedule to tomorrow", "Delete"]);
  });
});

test.describe("Screenshots", () => {
  test.skip(!SHOTS, "set PLANNER_SHOTS_DIR to save them");

  for (const route of ["home", "planner"]) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} ${theme}`, async ({ page }, info) => {
        await open(page, `/${route}`, theme);
        await expect(page.getByTestId(route === "home" ? "home-plan" : "planner-page")).toBeVisible();
        await expect(page.getByTestId("timeline")).toBeVisible();
        await page.waitForTimeout(800);
        const width = info.project.name.startsWith("mobile") ? "mobile-390x844" : "desktop-1280x800";
        await page.screenshot({ path: path.join(SHOTS!, `${route}-${width}-${theme}.png`), fullPage: true });
        if (width.startsWith("desktop")) {
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(SHOTS!, `${route}-desktop-1440x900-${theme}.png`), fullPage: true });
        }
      });
    }
  }
});
