// @vitest-environment jsdom
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { quickAccessItems, type QuickAccessCounts } from "@/components/home/quickAccess";
import { LogScreenScaffold, type LogTab } from "@/components/logs/LogScreenScaffold";
import { BacklogOpenList, primaryBacklogId } from "@/components/logs/BacklogLists";
import { countBySubject } from "@/components/logs/panels/BacklogSidePanel";
import { accuracyBySubject } from "@/components/logs/panels/PracticeSidePanel";
import { mostRevisedThisWeek, revisionStreak } from "@/components/logs/panels/RevisionSidePanel";
import { PracticeTab } from "@/components/logs/PracticeTab";
import { SpacedRepetitionTab, dueLabel, groupByDueDay } from "@/components/logs/SpacedRepetitionTab";
import { mockTaskHref } from "@/components/home/taskTypes";
import type { BacklogItem } from "@/lib/api/backlogItems";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { RevisionChapterProgress, RevisionOverview, RevisionTask } from "@/lib/api/revision";
import { examPatternOf, scorecardToForm } from "@/lib/logs/scorecard";
import { makeSubjectLookup } from "@/lib/study/subjects";

vi.mock("@/lib/api/revision", async (orig) => ({ ...(await orig<typeof import("@/lib/api/revision")>()), getRevisionOverview: vi.fn(), skipRevisionTask: vi.fn(), demoteRevisionChapter: vi.fn() }));
vi.mock("@/components/logs/RevisionHub", () => ({ RevisionHub: () => null }));
import { demoteRevisionChapter, getRevisionOverview } from "@/lib/api/revision";

vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
import { startFocusSession } from "@/lib/focus/startFocusSession";

vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));

const root = path.resolve(import.meta.dirname, "..", "..");
const coralCount = (el: ParentNode) => [...el.querySelectorAll("button, a")].filter((b) => /(^|\s)(bg-cta|bg-brand-coral)(\s|$)/.test(b.className)).length;

beforeEach(() => vi.clearAllMocks());

type T = "a" | "b" | "c";
const TABS: LogTab<T>[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
];

describe("LogScreenScaffold", () => {
  it("is two columns from 1024px (main 3fr, side panel at least 320px), one column below, in a 1400px container", () => {
    render(
      <LogScreenScaffold name="demo" title="Demo" tabs={TABS} activeTab="a" onTabChange={vi.fn()} sidePanel={<p>side</p>}>
        <p>main</p>
      </LogScreenScaffold>,
    );
    expect(screen.getByTestId("log-scaffold").className).toContain("max-w-[1400px]");
    const grid = screen.getByTestId("log-grid").className;
    expect(grid).toContain("grid-cols-1");
    expect(grid).toContain("lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]");
    expect(within(screen.getByTestId("log-main")).getByText("main")).toBeInTheDocument();
    expect(within(screen.getByTestId("log-side-panel")).getByText("side")).toBeInTheDocument();
    expect(screen.getByTestId("log-side-panel").className).toContain("lg:sticky");
  });

  it("renders every tab, marks the active one, and changes tab on click and with the arrow keys", async () => {
    const onTab = vi.fn();
    render(
      <LogScreenScaffold name="demo" title="Demo" tabs={TABS} activeTab="b" onTabChange={onTab}>
        <p>main</p>
      </LogScreenScaffold>,
    );
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(screen.getByTestId("demo-tab-b")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("demo-tab-b").className).toContain("border-saffron");
    await userEvent.click(screen.getByTestId("demo-tab-c"));
    expect(onTab).toHaveBeenLastCalledWith("c");
    screen.getByTestId("demo-tab-b").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onTab).toHaveBeenLastCalledWith("c");
  });

  it("below 1024px the side panel is a collapsible section under the content, and tablets also get a chip row", async () => {
    render(
      <LogScreenScaffold name="demo" title="Demo" tabs={TABS} activeTab="a" onTabChange={vi.fn()} sidePanel={<p>side</p>} sidePanelLabel="More" summaryChips={[{ label: "Due", value: "3" }]}>
        <p>main</p>
      </LogScreenScaffold>,
    );
    const body = screen.getByTestId("side-panel-body");
    expect(body.className).toMatch(/\bhidden\b/);
    expect(body.className).toContain("lg:block");
    await userEvent.click(screen.getByTestId("side-panel-toggle"));
    expect(screen.getByTestId("side-panel-toggle")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("side-panel-body").className).not.toMatch(/\bhidden\b/);
    expect(screen.getByTestId("summary-chips").className).toMatch(/md:flex.*lg:hidden|lg:hidden.*md:flex/);
    expect(screen.getByTestId("side-panel-toggle").className).toContain("lg:hidden");
  });

  it("has no outer card around the page and puts the header action on the subtitle row", () => {
    render(
      <LogScreenScaffold name="demo" title="Demo" subtitle="Words" tabs={TABS} activeTab="a" onTabChange={vi.fn()} headerActions={<button type="button">Act</button>}>
        <p>main</p>
      </LogScreenScaffold>,
    );
    expect(screen.getByText("Words")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByTestId("demo-page").className).toContain("bg-surface-base");
    expect(screen.getByTestId("demo-page").className).not.toMatch(/border|rounded/);
  });
});

describe("each log page uses the scaffold with the right tabs", () => {
  const page = (rel: string) => readFileSync(path.join(root, "app/(app)/logs", rel, "page.tsx"), "utf8");
  const tabIds = (src: string) => [...src.matchAll(/\{ id: "([a-z]+)", label:/g)].map((m) => m[1]);

  it("Revision: Today, Spaced Repetition, Log, Analytics, History", () => {
    const src = page("revision");
    expect(src).toContain("<LogScreenScaffold");
    expect(tabIds(src)).toEqual(["today", "sr", "log", "analytics", "history"]);
    expect(src).toContain('label: "Spaced Repetition"');
    expect(src).toContain("RotateCw");
  });

  it("Backlog: Open, Add, Analytics, History (as before)", () => {
    const src = page("backlog");
    expect(src).toContain("<LogScreenScaffold");
    expect(tabIds(src)).toEqual(["open", "add", "analytics", "history"]);
  });

  it("Practice: Practice first and the default, then Log, Sessions, Analytics, Share", () => {
    const src = page("practice");
    expect(src).toContain("<LogScreenScaffold");
    expect(tabIds(src)).toEqual(["practice", "log", "sessions", "analytics", "share"]);
    expect(src).toContain('useState<Tab>("practice")');
    expect(src).toContain("SquarePen");
  });

  it("Mocks: Log Mock, All Mocks, Analytics, Share, and the scorecard photo upload is on the log tab", () => {
    const src = page("mocks");
    expect(src).toContain("<LogScreenScaffold");
    expect(tabIds(src)).toEqual(["log", "all", "analytics", "share"]);
    expect(src).toContain("<ScorecardUpload");
  });
});

describe("Quick Access goes to the new logs", () => {
  const counts: QuickAccessCounts = { sessionsToday: 1, questionsThisWeek: 1, revisionsDue: 1, backlogOpen: 2, mistakesOpen: 1, mocksThisWeek: 1 };
  const hrefOf = (key: string) => quickAccessItems(counts).find((i) => i.key === key)?.href;

  it("Practice, Revision, Backlog and Mocks open the /logs screens", () => {
    expect(hrefOf("practice")).toBe("/logs/practice");
    expect(hrefOf("revision")).toBe("/logs/revision");
    expect(hrefOf("backlog")).toBe("/logs/backlog");
    expect(hrefOf("mocks")).toBe("/logs/mocks");
  });

  it("a planned mock opens the mock log, with its name and date filled in when it has them", () => {
    expect(mockTaskHref({})).toBe("/logs/mocks");
    expect(mockTaskHref({ mockName: "AITS 4", mockDate: "2026-10-30" })).toBe("/logs/mocks?mockName=AITS+4&date=2026-10-30");
    expect(mockTaskHref({ isCompleted: true, mockAnalysisId: "x" })).toBe("/logs/mocks?tab=all");
  });

  it("nothing in the app points at the deleted legacy routes, and the routes are gone", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = path.join(dir, n);
        if (n === "node_modules" || n === ".next") return [];
        return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(n) && !n.endsWith(".test.tsx") && !n.endsWith(".test.ts") ? [p] : [];
      });
    const offenders = ["app", "components", "lib"].flatMap((d) => walk(path.join(root, d))).filter((f) => /\/home\/revision|\/home\/mock-analysis|data-legacy-log/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    expect(existsSync(path.join(root, "app/(app)/home/revision"))).toBe(false);
    expect(existsSync(path.join(root, "app/(app)/home/mock-analysis"))).toBe(false);
  });
});

const chapter = (over: Partial<RevisionChapterProgress> = {}): RevisionChapterProgress => ({
  id: "p1", chapterId: "c1", status: "ACTIVE", secondsCompleted: 0, revisionPhase: "SR", revisionCount: 2, nextRevisionAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  lastRevisionAt: "2026-10-10T00:00:00.000Z", currentIntervalDays: 7,
  chapter: { id: "c1", name: "Kinematics", subject: { id: 1, name: "Physics", code: "PHY" } as never },
  ...over,
});

const task = (over: Partial<RevisionTask> = {}): RevisionTask => ({
  id: "t1", subjectId: 1, taskType: "REVISION", title: "Revise Kinematics", description: null, estimatedMinutes: 30, secondsCompleted: 0, scheduledStart: "", scheduledEnd: "", suggestedWindow: "MORNING",
  status: "PENDING", questionCount: null, chapter: { id: "c1", name: "Kinematics", subject: { id: 1, name: "Physics", code: "PHY" } as never }, ...over,
});

const overview = (over: Partial<RevisionOverview> = {}): RevisionOverview => ({
  todaysRevisionTasks: { count: 2, tasks: [task(), task({ id: "t2", chapter: { id: "c2", name: "Laws of Motion", subject: { id: 1, name: "Physics", code: "PHY" } as never } })] },
  upcomingRevisions: { count: 1, chapters: [chapter()] },
  masteredChapters: { count: 1, chapters: [chapter({ id: "p9", chapterId: "c9", currentIntervalDays: 90, chapter: { id: "c9", name: "Work and Energy", subject: { id: 1, name: "Physics", code: "PHY" } as never } })] },
  ...over,
});

describe("Spaced Repetition tab", () => {
  it("summarises the queue, lists what is due, and has exactly one coral button: Start Revision on the first card", async () => {
    vi.mocked(getRevisionOverview).mockResolvedValue({ success: true, data: overview() });
    const { container } = render(<SpacedRepetitionTab />);
    expect(await screen.findByTestId("sr-summary")).toHaveTextContent("4 chapters in your queue · 2 planned today");
    expect(screen.getAllByTestId("sr-due-card")).toHaveLength(2);
    expect(screen.getAllByTestId("sr-start")[0]!.className).toContain("bg-brand-coral");
    expect(screen.getAllByTestId("sr-start")[1]!.className).not.toContain("bg-brand-coral");
    expect(coralCount(container)).toBe(1);
    await userEvent.click(screen.getAllByTestId("sr-start")[0]!);
    expect(startFocusSession).toHaveBeenCalledWith(expect.objectContaining({ originSource: "revision_tab", originId: "t1", chapter: "c1", taskType: "revision", targetMinutes: 30 }));
  });

  it("shows interval and last-revised for a due chapter, and groups upcoming chapters by day inside a collapsible", async () => {
    vi.mocked(getRevisionOverview).mockResolvedValue({ success: true, data: overview() });
    render(<SpacedRepetitionTab />);
    await screen.findByTestId("sr-summary");
    expect(within(screen.getAllByTestId("sr-due-card")[0]!).getByText("Interval 7d")).toBeInTheDocument();
    expect(screen.queryByTestId("sr-chapter")).toBeNull();
    await userEvent.click(within(screen.getByTestId("sr-upcoming")).getByRole("button", { name: /Upcoming/ }));
    expect(screen.getAllByTestId("sr-chapter")).toHaveLength(1);
  });

  it("re-queueing a mastered chapter asks first, then demotes it", async () => {
    vi.mocked(getRevisionOverview).mockResolvedValue({ success: true, data: overview() });
    vi.mocked(demoteRevisionChapter).mockResolvedValue({ success: true, data: null });
    render(<SpacedRepetitionTab />);
    await screen.findByTestId("sr-summary");
    await userEvent.click(within(screen.getByTestId("sr-mastered")).getByRole("button", { name: /Mastered/ }));
    await userEvent.click(screen.getByTestId("sr-requeue"));
    expect(demoteRevisionChapter).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("sr-requeue-confirm"));
    await waitFor(() => expect(demoteRevisionChapter).toHaveBeenCalledWith("p9"));
  });

  it("says so when nothing is due", async () => {
    vi.mocked(getRevisionOverview).mockResolvedValue({ success: true, data: overview({ todaysRevisionTasks: { count: 0, tasks: [] } }) });
    const { container } = render(<SpacedRepetitionTab />);
    expect(await screen.findByTestId("sr-due-empty")).toBeInTheDocument();
    expect(coralCount(container)).toBe(0);
  });

  it("labels due days and groups upcoming chapters soonest first", () => {
    const now = new Date("2026-10-26T09:00:00");
    expect(dueLabel("2026-10-26T20:00:00", now)).toBe("Today");
    expect(dueLabel("2026-10-27T01:00:00", now)).toBe("Tomorrow");
    const groups = groupByDueDay([chapter({ id: "x", nextRevisionAt: "2026-10-29T10:00:00" }), chapter({ id: "y", nextRevisionAt: "2026-10-27T10:00:00" }), chapter({ id: "z", nextRevisionAt: "2026-10-27T15:00:00" })], now);
    expect(groups.map((g) => [g.label, g.chapters.map((c) => c.id)])).toEqual([
      ["Tomorrow", ["y", "z"]],
      [expect.stringMatching(/Thu/), ["x"]],
    ]);
  });
});

describe("side panel maths", () => {
  it("counts the revision streak back from today (or yesterday), and finds the most revised chapter this week", () => {
    const now = new Date("2026-10-28T10:00:00");
    const at = (d: string) => ({ loggedAt: new Date(`${d}T09:00:00`).toISOString(), chapterId: d < "2026-10-26" ? "old" : "kin" });
    expect(revisionStreak([at("2026-10-28"), at("2026-10-27"), at("2026-10-26"), at("2026-10-24")], now)).toBe(3);
    expect(revisionStreak([at("2026-10-27"), at("2026-10-26")], now)).toBe(2);
    expect(revisionStreak([at("2026-10-24")], now)).toBe(0);
    expect(mostRevisedThisWeek([at("2026-10-28"), at("2026-10-27"), at("2026-10-20")], now)).toEqual({ chapterId: "kin", count: 2 });
    expect(mostRevisedThisWeek([at("2026-10-20")], now)).toBeNull();
  });

  it("groups backlog items by subject, biggest first, and picks the oldest open item for the one coral button", () => {
    expect(countBySubject([{ subjectId: 2 }, { subjectId: 1 }, { subjectId: 1 }])).toEqual([{ subjectId: 1, count: 2 }, { subjectId: 2, count: 1 }]);
    expect(primaryBacklogId([{ id: "a", status: "open", ageDays: 2 }, { id: "b", status: "open", ageDays: 9 }, { id: "c", status: "scheduled", ageDays: 30 }])).toBe("b");
    expect(primaryBacklogId([{ id: "c", status: "scheduled", ageDays: 30 }])).toBeNull();
  });

  it("weights practice accuracy by attempts", () => {
    const out = accuracyBySubject([
      { subjectId: 1, subjectName: "Physics", attempted: 10, correct: 5 },
      { subjectId: 1, subjectName: "Physics", attempted: 30, correct: 30 },
      { subjectId: 2, subjectName: "Chemistry", attempted: 0, correct: 0 },
    ]);
    expect(out).toEqual([{ subjectId: 1, name: "Physics", attempted: 40, accuracy: 88 }]);
  });
});

describe("Backlog: one coral button", () => {
  const item = (id: string, ageDays: number): BacklogItem =>
    ({ id, subjectId: 1, chapterId: null, topic: id, source: "manual", estimatedMinutes: 30, deadline: null, priority: 3, status: "open", clearedAt: null, scheduledFor: null, scheduledWindow: null, notes: null, ageDays, isOverdue: false, progressPercent: 0, createdAt: "" }) as BacklogItem;
  const lookup = makeSubjectLookup([{ subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [] }] as SubjectChapters[]);
  const handlers = { lookup, hasMore: false, onLoadMore: vi.fn(), onClear: vi.fn(), onSchedule: vi.fn(), onUnschedule: vi.fn(), onEdit: vi.fn(), onDrop: vi.fn(), busyId: null };

  it("Start is coral on the oldest open item only; Clear, Schedule, Edit and Drop are not", () => {
    const { container } = render(<BacklogOpenList items={[item("new", 1), item("old", 12), item("mid", 5)]} {...handlers} />);
    expect(coralCount(container)).toBe(1);
    expect(screen.getByTestId("start-old").className).toContain("bg-brand-coral");
    expect(screen.getByTestId("start-new").className).not.toContain("bg-brand-coral");
    expect(screen.getByTestId("clear-old").className).not.toMatch(/bg-cta|bg-brand-coral/);
  });
});

describe("Practice tab", () => {
  const subjects = [
    { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: "c1", subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] },
    { subjectId: 2, subjectCode: "CHE", subjectName: "Chemistry", chapters: [{ id: "c2", subjectId: 2, name: "Mole Concept", sequenceOrder: 1, isActive: true }] },
  ] as SubjectChapters[];

  it("shows the filters, the question bank notice, placeholder chapter tests, and one coral button: + Log a practice session", async () => {
    const onLog = vi.fn();
    const { container } = render(<PracticeTab subjects={subjects} onLog={onLog} />);
    expect(screen.getByText("Practice questions by chapter")).toBeInTheDocument();
    expect(screen.getByTestId("practice-notice")).toHaveTextContent("Question bank is loading");
    expect(screen.getAllByTestId("practice-test-card")).toHaveLength(2);
    expect(coralCount(container)).toBe(1);
    await userEvent.click(screen.getByTestId("practice-subject-2"));
    expect(screen.getAllByTestId("practice-test-card")).toHaveLength(1);
    expect(screen.getByText("Mole Concept")).toBeInTheDocument();
    await userEvent.type(screen.getByTestId("practice-chapter-search"), "zzz");
    expect(screen.getByText("No chapters match.")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("practice-log-session"));
    expect(onLog).toHaveBeenCalled();
    expect(screen.getByTestId("practice-open-prepex")).toHaveAttribute("href", "/practice/sessions");
  });
});

describe("scorecard photo to the mock form", () => {
  it("reads the exam pattern, marks, time, date and subject marks", () => {
    expect(examPatternOf("JEE Advanced")).toBe("jee_advanced");
    expect(examPatternOf("NEET UG")).toBe("neet");
    expect(examPatternOf("JEE Main 2026")).toBe("jee_main");
    expect(examPatternOf("Board")).toBeUndefined();
    const subjects = [
      { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [] },
      { subjectId: 3, subjectCode: "MATH", subjectName: "Maths", chapters: [] },
    ] as SubjectChapters[];
    const form = scorecardToForm(
      { attemptedDate: "2026-10-20T00:00:00.000Z", mockName: "AITS 4", sourceInstitute: "Allen", examType: "JEE Main", totalScore: 180, maxScore: 300, timeTakenMinutes: 170, testDurationMinutes: 180, entryMethod: "OCR", entryTier: "BASIC", subjectScores: [{ subjectId: 1, score: 70, maxScore: 100 }, { subjectId: 3, score: 60, maxScore: 100 }] } as never,
      subjects,
    );
    expect(form).toEqual({ examPattern: "jee_main", testName: "AITS 4", dateTaken: "2026-10-20", totalMarks: 180, maxMarks: 300, timeMinutes: 170, subjectMarks: { physics: 70, maths: 60 }, notes: "Source: Allen" });
  });
});

describe("one coral button per log screen state", () => {
  const allowedFiles = new Set([
    "components/ui/CoralButton.tsx",
    "components/logs/SpacedRepetitionTab.tsx",
    "components/logs/PracticeTab.tsx",
    "components/logs/BacklogLists.tsx",
    "app/(app)/logs/mocks/page.tsx",
    // the Log and Add tabs' forms: a form's submit is that tab's one coral button
    "components/logs/BacklogForm.tsx",
    // the Add tab: the fast intake is its one coral button (the single-item form under it is a ghost)
    "components/logs/BacklogIntake.tsx",
    "components/logs/PracticeForm.tsx",
    "components/logs/RevisionForm.tsx",
    "components/mocks/MockForm.tsx",
    // the planner picker modal's confirm: a modal is its own state
    "components/logs/PlannerPickerModal.tsx",
  ]);

  it("filled coral appears only in the files that own a screen state's one primary action", () => {
    const dirs = ["components/logs", "components/mocks", "app/(app)/logs"];
    const files = dirs.flatMap((d) =>
      readdirSync(path.join(root, d), { recursive: true })
        .map(String)
        .filter((f) => /\.tsx$/.test(f) && !f.endsWith(".test.tsx"))
        .map((f) => `${d}/${f.replace(/\\/g, "/")}`),
    );
    const offenders = files.filter((f) => !allowedFiles.has(f)).filter((f) => /bg-cta|bg-brand-coral|CoralButton|E8623F/.test(readFileSync(path.join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the share buttons are ghost", () => {
    expect(readFileSync(path.join(root, "components/logs/SharePanel.tsx"), "utf8")).not.toMatch(/bg-cta/);
    expect(readFileSync(path.join(root, "components/mocks/MockSharePanel.tsx"), "utf8")).not.toMatch(/bg-cta/);
  });

  it("no emoji in the logs screens", () => {
    const EMOJI = /\p{Extended_Pictographic}/u;
    for (const d of ["components/logs", "components/mocks", "app/(app)/logs"]) {
      for (const f of readdirSync(path.join(root, d), { recursive: true }).map(String).filter((n) => /\.tsx?$/.test(n))) {
        const hit = readFileSync(path.join(root, d, f), "utf8").split("\n").findIndex((l) => EMOJI.test(l));
        expect(hit, `${d}/${f} line ${hit + 1} has an emoji`).toBe(-1);
      }
    }
  });
});

// keep the act import used when React warns about state updates in the tab effects
void act;
