// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { ResolvedIntent } from "@/lib/api/focus";
import { ApiError } from "@/lib/api/http";
import { appBlockMode, formatAway, readBlockedApps, storeBlockedApps } from "@/lib/focus/appBlock";
import { readFlag } from "@/lib/focus/flags";
import {
  ORIGIN_SOURCES,
  defaultMode,
  intentToParams,
  originChipText,
  parseIntentParams,
  type FocusSessionIntent,
} from "@/lib/focus/intent";
import { MAX_RETRY_ATTEMPTS, isRetryable, retryDelayMs } from "@/lib/focus/pendingStop";
import {
  DEFAULT_POMODORO,
  breakDue,
  breakRemainingSeconds,
  breaksTakenBefore,
  clampPomodoro,
  pomodoroForTarget,
  pomodoroPlannedMinutes,
  pomodoroPosition,
} from "@/lib/focus/pomodoro";
import { needsServerIntent, resolveFocusIntent, subjectIdFromHint, subjectIdOfChapter } from "@/lib/focus/resolve";
import { cardDuration, shareText } from "@/lib/focus/shareCard";
import { FOCUS_START_PATH, focusSessionHref, registerFocusNavigator, startFocusSession } from "@/lib/focus/startFocusSession";

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const KINEMATICS = "22222222-2222-4222-8222-222222222222";
const MOLES = "33333333-3333-4333-8333-333333333333";

const SUBJECTS: SubjectChapters[] = [
  { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: KINEMATICS, subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] },
  { subjectId: 2, subjectCode: "CHEM", subjectName: "Chemistry", chapters: [{ id: MOLES, subjectId: 2, name: "Mole Concept", sequenceOrder: 1, isActive: true }] },
  { subjectId: 3, subjectCode: "MATH", subjectName: "Mathematics", chapters: [] },
];

describe("the intent URL (deeplinks and CTAs share it)", () => {
  it("round-trips an intent through /focus/start query params", () => {
    const intent: FocusSessionIntent = {
      originSource: "planner",
      originId: PLAN_ID,
      subject: "physics",
      chapter: KINEMATICS,
      topic: "Projectile motion",
      taskType: "lecture",
      targetMinutes: 60,
      mode: "pomodoro",
      notice: "No Prepex questions for this chapter yet.",
    };
    expect(parseIntentParams(intentToParams(intent))).toEqual(intent);
  });

  it("writes only what the intent carries", () => {
    expect(intentToParams({ originSource: "home_quick_tile" }).toString()).toBe("origin=home_quick_tile");
    expect(focusSessionHref({ originSource: "standalone" })).toBe(`${FOCUS_START_PATH}?origin=standalone`);
  });

  it("the documented deeplinks parse to the right intent", () => {
    expect(parseIntentParams(new URLSearchParams(`origin=planner&id=${PLAN_ID}`))).toEqual({ originSource: "planner", originId: PLAN_ID });
    expect(parseIntentParams(new URLSearchParams(`origin=revision_tab&id=${PLAN_ID}`))).toEqual({ originSource: "revision_tab", originId: PLAN_ID });
    expect(parseIntentParams(new URLSearchParams(`origin=backlog_tab&id=${PLAN_ID}`))).toEqual({ originSource: "backlog_tab", originId: PLAN_ID });
    expect(parseIntentParams(new URLSearchParams(`origin=practice_tab&chapter=${KINEMATICS}`))).toEqual({ originSource: "practice_tab", chapter: KINEMATICS });
    expect(parseIntentParams(new URLSearchParams(`origin=mistake_notebook&id=${PLAN_ID}`))).toEqual({ originSource: "mistake_notebook", originId: PLAN_ID });
    expect(parseIntentParams(new URLSearchParams(`origin=syllabus_overview&chapter=${KINEMATICS}`))).toEqual({ originSource: "syllabus_overview", chapter: KINEMATICS });
    expect(parseIntentParams(new URLSearchParams("origin=home_quick_tile"))).toEqual({ originSource: "home_quick_tile" });
    expect(parseIntentParams(new URLSearchParams("origin=standalone"))).toEqual({ originSource: "standalone" });
  });

  it("a hand-edited or stale link degrades to a standalone timer, never an error", () => {
    expect(parseIntentParams(new URLSearchParams(""))).toEqual({ originSource: "standalone" });
    expect(parseIntentParams(new URLSearchParams("origin=timer_v1"))).toEqual({ originSource: "standalone" });
    const junk = parseIntentParams(new URLSearchParams(`origin=planner&id=42&chapter=abc&type=nap&mode=zen&minutes=lots`));
    expect(junk).toEqual({ originSource: "planner" });
    expect(parseIntentParams(new URLSearchParams("origin=planner&minutes=99999")).targetMinutes).toBe(480);
  });

  it("every origin has a place to go back to and the chip says where the session came from", () => {
    expect(originChipText("planner")).toBe("From today's plan");
    expect(originChipText("revision_tab")).toBe("From revision queue");
    expect(originChipText("standalone")).toBeNull();
    for (const origin of ORIGIN_SOURCES) expect(parseIntentParams(new URLSearchParams(`origin=${origin}`)).originSource).toBe(origin);
  });

  it("pomodoro up to an hour, countdown above", () => {
    expect(defaultMode(25)).toBe("pomodoro");
    expect(defaultMode(60)).toBe("pomodoro");
    expect(defaultMode(61)).toBe("countdown");
    expect(defaultMode(undefined)).toBe("pomodoro");
  });
});

describe("startFocusSession", () => {
  afterEach(() => vi.restoreAllMocks());

  it("goes through the registered router with the intent as query params", () => {
    const go = vi.fn();
    const unregister = registerFocusNavigator(go);
    startFocusSession({ originSource: "planner", originId: PLAN_ID, taskType: "revision", targetMinutes: 30 });
    expect(go).toHaveBeenCalledWith(`/focus/start?origin=planner&id=${PLAN_ID}&type=revision&minutes=30`);
    unregister();
  });

  it("stops using a router once it unregisters", () => {
    const first = vi.fn();
    const second = vi.fn();
    const off1 = registerFocusNavigator(first);
    const off2 = registerFocusNavigator(second);
    off1(); // an older registration must not unhook the newer one
    startFocusSession({ originSource: "standalone" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    off2();
  });
});

describe("resolving an intent against the student's syllabus", () => {
  it("matches subjects by name, code and id", () => {
    expect(subjectIdFromHint("physics", SUBJECTS)).toBe(1);
    expect(subjectIdFromHint("Chemistry", SUBJECTS)).toBe(2);
    expect(subjectIdFromHint("maths", SUBJECTS)).toBe(3);
    expect(subjectIdFromHint("MATH", SUBJECTS)).toBe(3);
    expect(subjectIdFromHint("2", SUBJECTS)).toBe(2);
    expect(subjectIdFromHint("9", SUBJECTS)).toBeNull();
    expect(subjectIdFromHint("biology", SUBJECTS)).toBeNull();
    expect(subjectIdFromHint(undefined, SUBJECTS)).toBeNull();
    expect(subjectIdOfChapter(MOLES, SUBJECTS)).toBe(2);
    expect(subjectIdOfChapter("nope", SUBJECTS)).toBeNull();
  });

  const server: ResolvedIntent = {
    originSource: "planner",
    originId: PLAN_ID,
    subjectId: 1,
    chapterId: KINEMATICS,
    topic: "Thermodynamics",
    taskType: "self_study",
    targetMinutes: 75,
    humanReadableOrigin: "today's plan",
  };

  it("the server's read of the task wins for subject, chapter, topic and length; the button decides the task type", () => {
    const resolved = resolveFocusIntent(
      { originSource: "planner", originId: PLAN_ID, subject: "chemistry", topic: "stale", taskType: "lecture", targetMinutes: 10 },
      server,
      SUBJECTS,
    );
    expect(resolved).toEqual({
      originSource: "planner",
      originId: PLAN_ID,
      subjectId: 1,
      chapterId: KINEMATICS,
      topic: "Thermodynamics",
      taskType: "lecture",
      targetMinutes: 75,
      mode: "countdown",
      notice: null,
    });
  });

  it("with no server answer the link's own hints are used", () => {
    const resolved = resolveFocusIntent({ originSource: "practice_tab", subject: "chemistry", chapter: MOLES, taskType: "practice", targetMinutes: 30, notice: "Hello" }, null, SUBJECTS);
    expect(resolved).toMatchObject({ subjectId: 2, chapterId: MOLES, taskType: "practice", targetMinutes: 30, mode: "pomodoro", notice: "Hello", originId: null });
  });

  it("a chapter from another subject is dropped, and a standalone intent is empty and editable", () => {
    expect(resolveFocusIntent({ originSource: "practice_tab", subject: "physics", chapter: MOLES }, null, SUBJECTS)).toMatchObject({ subjectId: 1, chapterId: null });
    expect(resolveFocusIntent({ originSource: "standalone" }, null, SUBJECTS)).toEqual({
      originSource: "standalone",
      originId: null,
      subjectId: null,
      chapterId: null,
      topic: "",
      taskType: "self_study",
      targetMinutes: 25,
      mode: "pomodoro",
      notice: null,
    });
  });

  it("a chapter alone is enough to find its subject", () => {
    expect(resolveFocusIntent({ originSource: "syllabus_overview", chapter: KINEMATICS }, null, SUBJECTS)).toMatchObject({ subjectId: 1, chapterId: KINEMATICS });
  });

  it("only links that name a row need the server", () => {
    expect(needsServerIntent({ originSource: "standalone" })).toBe(false);
    expect(needsServerIntent({ originSource: "home_quick_tile" })).toBe(false);
    expect(needsServerIntent({ originSource: "planner", originId: PLAN_ID })).toBe(true);
    expect(needsServerIntent({ originSource: "syllabus_overview", chapter: KINEMATICS })).toBe(true);
    expect(needsServerIntent({ originSource: "planner" })).toBe(false);
  });
});

describe("pomodoro", () => {
  it("defaults to 25 / 5 and clamps what the student types", () => {
    expect(DEFAULT_POMODORO).toEqual({ studyMinutes: 25, breakMinutes: 5, cycles: 4 });
    expect(clampPomodoro({ studyMinutes: 0, breakMinutes: 999, cycles: 50 })).toEqual({ studyMinutes: 1, breakMinutes: 60, cycles: 12 });
    expect(clampPomodoro({ studyMinutes: Number.NaN })).toEqual(DEFAULT_POMODORO);
    expect(pomodoroPlannedMinutes({ studyMinutes: 25, breakMinutes: 5, cycles: 4 })).toBe(100);
    expect(pomodoroPlannedMinutes({ studyMinutes: 180, breakMinutes: 5, cycles: 12 })).toBe(480);
  });

  it("fits cycles of 25 to a target length", () => {
    expect(pomodoroForTarget(25)).toEqual({ studyMinutes: 25, breakMinutes: 5, cycles: 1 });
    expect(pomodoroForTarget(60)).toMatchObject({ cycles: 2 });
    expect(pomodoroForTarget(5)).toMatchObject({ cycles: 1 });
  });

  const cfg = { studyMinutes: 25, breakMinutes: 5, cycles: 3 };

  it("tracks the block the student is in", () => {
    expect(pomodoroPosition(cfg, 0)).toMatchObject({ cycle: 1, secondsIntoBlock: 0, remainingInBlock: 1500, finished: false });
    expect(pomodoroPosition(cfg, 1499)).toMatchObject({ cycle: 1, remainingInBlock: 1 });
    expect(pomodoroPosition(cfg, 1500)).toMatchObject({ cycle: 2, secondsIntoBlock: 0 });
    expect(pomodoroPosition(cfg, 1500 * 2 + 60)).toMatchObject({ cycle: 3, secondsIntoBlock: 60, finished: false });
    expect(pomodoroPosition(cfg, 1500 * 3)).toMatchObject({ cycle: 3, remainingInBlock: 0, finished: true });
    expect(pomodoroPosition(cfg, 1500 * 3 + 600)).toMatchObject({ finished: true });
  });

  it("a break is due after each block except the last, once", () => {
    expect(breakDue(cfg, 1499, 0)).toBe(false);
    expect(breakDue(cfg, 1500, 0)).toBe(true);
    expect(breakDue(cfg, 1500, 1)).toBe(false); // already taken
    expect(breakDue(cfg, 3000, 1)).toBe(true);
    expect(breakDue(cfg, 4500, 2)).toBe(false); // the last block has no break after it
  });

  it("counts a break down from when it started, never below zero", () => {
    expect(breakRemainingSeconds(cfg, 0)).toBe(300);
    expect(breakRemainingSeconds(cfg, 120.9)).toBe(180);
    expect(breakRemainingSeconds(cfg, 999)).toBe(0);
  });

  it("works out the breaks already behind a student who reloads mid-session", () => {
    expect(breaksTakenBefore(cfg, 100, false)).toBe(0);
    expect(breaksTakenBefore(cfg, 1600, false)).toBe(1);
    expect(breaksTakenBefore(cfg, 1500, true)).toBe(0); // paused exactly on the boundary: that break is the one in progress
    expect(breaksTakenBefore(cfg, 99999, false)).toBe(2);
  });
});

describe("saving a finished session in the background", () => {
  it("retries a lost connection, a server error and a rate limit, but not a rejected request", () => {
    expect(isRetryable(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryable(new ApiError(500, "boom"))).toBe(true);
    expect(isRetryable(new ApiError(503, "down"))).toBe(true);
    expect(isRetryable(new ApiError(429, "slow down"))).toBe(true);
    expect(isRetryable(new ApiError(400, "bad sheet"))).toBe(false);
    expect(isRetryable(new ApiError(404, "gone"))).toBe(false);
    expect(isRetryable(new ApiError(409, "already ended"))).toBe(false);
  });

  it("backs off, and stops getting longer after a minute", () => {
    expect([0, 1, 2, 3, 4, 5, 50].map(retryDelayMs)).toEqual([2000, 5000, 15000, 30000, 60000, 60000, 60000]);
    expect(MAX_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(10);
  });
});

describe("flags", () => {
  it("default to on and read on / off words", () => {
    expect(readFlag(undefined, true)).toBe(true);
    expect(readFlag("", true)).toBe(true);
    expect(readFlag("off", true)).toBe(false);
    expect(readFlag("FALSE", true)).toBe(false);
    expect(readFlag("0", true)).toBe(false);
    expect(readFlag("on", false)).toBe(true);
    expect(readFlag("maybe", true)).toBe(true);
  });
});

describe("app blocking and the share card", () => {
  beforeEach(() => localStorage.clear());

  it("on the web there is no native plugin, so the timer only reminds", () => {
    expect(appBlockMode()).toBe("web");
  });

  it("every app is on the block list until the student turns one off", () => {
    expect(readBlockedApps()).toEqual(["instagram", "youtube", "whatsapp", "discord"]);
    storeBlockedApps(["youtube"]);
    expect(readBlockedApps()).toEqual(["youtube"]);
    storeBlockedApps([]);
    expect(readBlockedApps()).toEqual([]);
  });

  it("says how long the student was away", () => {
    expect(formatAway(43_000)).toBe("43s");
    expect(formatAway(72_000)).toBe("1m 12s");
  });

  it("the card's words", () => {
    expect(cardDuration(45)).toBe("45 min");
    expect(cardDuration(65)).toBe("1h 05m");
    expect(shareText({ minutes: 60, subjectName: "Physics", chapterName: "Thermodynamics", taskTypeLabel: "Lecture", streakDays: 5, highlights: [] })).toBe(
      "1h 00m of lecture on Physics: Thermodynamics. 5-day streak. Studying with Prepex.",
    );
  });
});
