// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(), sendHeartbeat: vi.fn(async () => ({ activeSeconds: 0, countsToday: false, thresholdSeconds: 120 })) }));
vi.mock("@/lib/api/pexo", async (orig) => ({ ...(await orig<typeof import("@/lib/api/pexo")>()), updatePexoSettings: vi.fn() }));

import { Pexo } from "@/components/pexo/Pexo";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { PexoLayer, REACTION_MS } from "@/components/pexo/PexoLayer";
import { PexoSettings } from "@/components/pexo/PexoSettings";
import { MOODS, MOOD_NAMES, PEXO_ACCESSORIES, PEXO_PROPS } from "@/components/pexo/moods";
import { Heartbeat } from "@/components/rewards/Heartbeat";
import { updatePexoSettings, type PexoState } from "@/lib/api/pexo";
import { getXpSummary, sendHeartbeat } from "@/lib/api/xp";
import { placeholdersOf, selectLine } from "@/lib/pexo/engine";
import { PEXO_LIBRARY, dismissPexo, loadPexo, pexoEvent, pexoFirstVisit, pexoMark, pexoReact, pexoSay, primePexo, resetPexo, returnPexoBatch, takePexoBatch } from "@/lib/pexo/store";

const TODAY = "2026-11-12";
const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 1, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: [], marks: {}, today: TODAY, ...over });
const off = (): PexoState => on({ enabled: false, cohort: "flag_off" });
const setMotion = (m: "full" | "lite" | "reduce") => document.documentElement.setAttribute("data-motion", m);

beforeEach(() => {
  resetPexo();
  setMotion("full");
  vi.mocked(getXpSummary).mockReset();
  vi.mocked(sendHeartbeat).mockClear();
  vi.mocked(updatePexoSettings).mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the bundled library and engine", () => {
  it("is the owner's file: version 2, 287 lines, both languages with matching placeholders", () => {
    expect(PEXO_LIBRARY.version).toBe(2);
    expect(PEXO_LIBRARY.lines).toHaveLength(287);
    for (const l of PEXO_LIBRARY.lines) expect(placeholdersOf(l.hi).sort(), l.id).toEqual(placeholdersOf(l.en).sort());
  });

  it("picks a variant that can be filled, in the student's language, and says nothing rather than show a placeholder", () => {
    const user = { language: "en" as const, shown: {} };
    expect(selectLine(PEXO_LIBRARY, "home.morning", {}, user, TODAY)!.id).toBe("home.morning#2");
    expect(selectLine(PEXO_LIBRARY, "gps.up", {}, user, TODAY)).toBeNull();
    expect(selectLine(PEXO_LIBRARY, "gps.up", { delta: 2.4 }, user, TODAY)!.text).toBe("Readiness up 2.4. Here's why.");
    expect(selectLine(PEXO_LIBRARY, "task.undo", {}, { language: "hi", shown: {} }, TODAY)!.text).toBe(PEXO_LIBRARY.lines.find((l) => l.id === "task.undo#1")!.hi);
  });
});

describe("the store", () => {
  it("flag off: Pexo says nothing, shows nothing and records nothing", () => {
    primePexo(off());
    expect(pexoSay("task.done")).toBeNull();
    expect(pexoReact("task.done")).toBeNull();
    expect(pexoFirstVisit("planner")).toBe(false);
    expect(pexoMark("tour")).toBe(false);
    pexoEvent("tour_completed");
    expect(takePexoBatch()).toBeNull();
  });

  it("before the state is known Pexo stays silent", () => {
    expect(pexoSay("task.done")).toBeNull();
  });

  it("rotates on this device at once and queues what was shown for the heartbeat", () => {
    primePexo(on());
    const first = pexoSay("task.done")!;
    const second = pexoSay("task.done")!;
    expect(second.id).not.toBe(first.id);
    expect(pexoFirstVisit("planner")).toBe(true);
    expect(pexoFirstVisit("planner")).toBe(false);
    expect(pexoMark("easter.long_idle")).toBe(true);
    expect(pexoMark("easter.long_idle")).toBe(false);
    pexoEvent("tour_completed", { cards: 6 });
    const batch = takePexoBatch()!;
    expect(batch.shown!.sort()).toEqual([first.id, second.id].sort());
    expect(batch).toMatchObject({ firstVisits: ["planner"], marks: ["easter.long_idle"], events: [{ name: "tour_completed", props: { cards: 6 } }] });
    expect(takePexoBatch()).toBeNull();
    returnPexoBatch(batch); // a failed heartbeat hands it back
    expect(takePexoBatch()!.shown).toHaveLength(2);
  });

  it("a fresh summary keeps what this device showed but has not sent yet", () => {
    primePexo(on());
    const pick = pexoSay("task.undo")!;
    pexoFirstVisit("focus");
    primePexo(on({ shown: { "task.done#1": "2026-11-10" } }));
    expect(pexoSay("task.done")!.id).not.toBe("task.done#1");
    expect(pexoFirstVisit("focus")).toBe(false);
    expect(takePexoBatch()!.shown).toContain(pick.id);
  });

  it("Quiet mode keeps first-visit, celebrations and care; Hinglish gives the hi line", () => {
    primePexo(on({ bubbles: "quiet" }));
    expect(pexoSay("task.done")).toBeNull();
    expect(pexoSay("home.morning", { n: 3, subject: "Physics" })).toBeNull();
    expect(pexoSay("first_visit.planner")).not.toBeNull();
    expect(pexoSay("task.done.all")!.mood).toBe("celebrating");
    expect(pexoSay("care.rest_day")).not.toBeNull();
    primePexo(on({ language: "hi" }));
    expect(pexoSay("care.rest_day")!.text).toBe(PEXO_LIBRARY.lines.find((l) => l.id === "care.rest_day#1")!.hi);
  });

  it("loads with the XP summary, once", async () => {
    vi.mocked(getXpSummary).mockResolvedValue({ pexo: on({ language: "hi" }) } as never);
    await Promise.all([loadPexo(), loadPexo()]);
    await loadPexo();
    expect(getXpSummary).toHaveBeenCalledTimes(1);
    expect(pexoSay("task.undo")!.text).toMatch(/Undo/i);
  });
});

describe("<Pexo>", () => {
  it("draws all ten moods with the right mouth, cheeks only when happy, proud or celebrating, and is labelled", () => {
    for (const mood of MOOD_NAMES) {
      const { container, unmount } = render(<Pexo mood={mood} size={96} />);
      const svg = screen.getByTestId("pexo");
      expect(svg).toHaveAttribute("data-mood", mood);
      expect(svg).toHaveAttribute("aria-label", "Pexo");
      expect(svg).toHaveAttribute("width", "96");
      expect(container.querySelector("[data-part='mouth']")).toHaveAttribute("data-mouth", MOODS[mood].mouth);
      expect(Boolean(container.querySelector("[data-part='cheeks']")), mood).toBe(["happy", "proud", "celebrating"].includes(mood));
      expect(container.querySelectorAll("[data-part='arm']")).toHaveLength(2);
      for (const p of MOODS[mood].props) expect(container.querySelector(`[data-prop='${p}']`), `${mood} ${p}`).not.toBeNull();
      unmount();
    }
  });

  it("holds any prop and wears any accessory; at 24 px it is just body, eyes and mouth", () => {
    for (const p of PEXO_PROPS) {
      const { container, unmount } = render(<Pexo prop={p} size={48} />);
      expect(container.querySelector(`[data-prop='${p}']`)).not.toBeNull();
      unmount();
    }
    for (const a of PEXO_ACCESSORIES) {
      const { container, unmount } = render(<Pexo accessory={a} size={96} />);
      expect(container.querySelector(`[data-accessory='${a}']`)).not.toBeNull();
      unmount();
    }
    const { container } = render(<Pexo mood="focused" accessory="cap" size={24} />);
    expect(container.querySelector("[data-part='brows']")).toBeNull();
    expect(container.querySelector("[data-part='arm']")).toBeNull();
    expect(container.querySelector("[data-prop]")).toBeNull();
    expect(container.querySelector("[data-accessory]")).toBeNull();
    expect(container.querySelectorAll("[data-part='pupil']")).toHaveLength(2);
    expect(container.querySelector("[data-part='mouth']")).not.toBeNull();
    expect(render(<Pexo mood="happy" prop={false} />).container.querySelector("[data-prop]")).toBeNull();
  });

  it("blinks in full motion; lite and reduced motion get a still face with no timers", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const lid = (c: HTMLElement) => (c.querySelector("[data-part='lid']") as SVGElement).style.transform;
    const full = render(<Pexo mood="happy" size={96} />);
    const open = lid(full.container);
    act(() => void vi.advanceTimersByTime(3010));
    expect(lid(full.container)).toBe("translateY(0px)"); // closed
    act(() => void vi.advanceTimersByTime(200));
    expect(lid(full.container)).toBe(open);
    full.unmount();

    for (const mode of ["lite", "reduce"] as const) {
      setMotion(mode);
      const still = render(<Pexo mood="happy" size={96} />);
      expect(vi.getTimerCount()).toBe(0);
      act(() => void vi.advanceTimersByTime(30_000));
      expect(lid(still.container)).toBe(open);
      still.unmount();
    }
    setMotion("full");
    const desk = render(<Pexo mood="focused" size={96} subtle />);
    expect(vi.getTimerCount()).toBe(0); // the focus desk only breathes
    desk.unmount();
    vi.mocked(Math.random).mockRestore();
  });

  it("a tap waves and three quick taps giggle", () => {
    const onTap = vi.fn();
    render(<Pexo size={96} onTap={onTap} />);
    const button = screen.getByRole("button", { name: "Pexo" });
    fireEvent.click(button);
    expect(onTap).toHaveBeenLastCalledWith("tap");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onTap).toHaveBeenLastCalledWith("poke3");
    expect(onTap).toHaveBeenCalledTimes(2);
  });
});

describe("<PexoBubble>", () => {
  const pick = { id: "task.done#1", trigger: "task.done", mood: "happy" as const, text: "Done." };

  it("says the line politely, with at most two actions and a dismiss", () => {
    const onDismiss = vi.fn();
    const go = vi.fn();
    render(<PexoBubble pick={pick} onDismiss={onDismiss} actions={[{ label: "Start", onClick: go }, { label: "Goals", href: "/goals" }, { label: "Third" }]} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Done.");
    expect(screen.getByTestId("pexo-bubble")).toHaveAttribute("data-line", "task.done#1");
    expect(screen.getAllByTestId("pexo-action")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute("href", "/goals");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(go).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull(); // never modal
  });

  it("usePexoLine picks once per key and does not re-roll on re-render", () => {
    primePexo(on());
    function Probe({ n }: { n: number }) {
      const line = usePexoLine("task.done", {}, "k");
      return <p data-testid="probe" data-n={n}>{line?.id ?? "none"}</p>;
    }
    const { rerender } = render(<Probe n={1} />);
    const first = screen.getByTestId("probe").textContent;
    expect(first).toMatch(/^task\.done#/);
    rerender(<Probe n={2} />);
    rerender(<Probe n={3} />);
    expect(screen.getByTestId("probe").textContent).toBe(first);
    expect(takePexoBatch()!.shown).toHaveLength(1);
  });
});

describe("<PexoLayer>", () => {
  it("renders nothing while Pexo is off", async () => {
    vi.mocked(getXpSummary).mockResolvedValue({ pexo: off() } as never);
    render(<PexoLayer />);
    await waitFor(() => expect(getXpSummary).toHaveBeenCalled());
    act(() => void pexoReact("task.done"));
    expect(screen.queryByTestId("pexo-layer")).toBeNull();
    expect(screen.queryByTestId("pexo")).toBeNull();
  });

  it("shows one reaction at a time and lets it leave on its own", () => {
    vi.useFakeTimers();
    vi.mocked(getXpSummary).mockResolvedValue({ pexo: on() } as never);
    primePexo(on());
    render(<PexoLayer />);
    act(() => void pexoReact("task.undo"));
    act(() => void pexoReact("task.moved_tomorrow"));
    expect(screen.getAllByTestId("pexo-transient")).toHaveLength(1);
    expect(screen.getByTestId("pexo-transient")).toHaveAttribute("data-line", "task.moved_tomorrow#1");
    act(() => void vi.advanceTimersByTime(REACTION_MS + 50));
    expect(screen.queryByTestId("pexo-transient")).toBeNull();
  });

  it("a first-visit bubble beats a reaction, stays until dismissed, and nothing speaks while muted", () => {
    vi.useFakeTimers();
    vi.mocked(getXpSummary).mockResolvedValue({ pexo: on() } as never);
    primePexo(on());
    const { rerender } = render(<PexoLayer />);
    act(() => void pexoReact("first_visit.planner", {}, { kind: "first_visit" }));
    act(() => expect(pexoReact("task.done")).toBeNull());
    act(() => void vi.advanceTimersByTime(REACTION_MS * 3));
    expect(screen.getByTestId("pexo-transient")).toHaveAttribute("data-line", "first_visit.planner#1");
    rerender(<PexoLayer muted />);
    expect(screen.queryByTestId("pexo-transient")).toBeNull();
    rerender(<PexoLayer />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByTestId("pexo-transient")).toBeNull();
    act(() => dismissPexo());
  });
});

describe("the heartbeat carries Pexo's batch", () => {
  it("one request a minute, with what was shown; a failed beat keeps the batch for the next", async () => {
    vi.useFakeTimers();
    primePexo(on());
    render(<Heartbeat />);
    const said = pexoSay("task.undo")!;
    vi.mocked(sendHeartbeat).mockRejectedValueOnce(new Error("offline"));
    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendHeartbeat).mock.calls[0]![1]).toEqual({ shown: [said.id] });
    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));
    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendHeartbeat).mock.calls[1]![1]).toEqual({ shown: [said.id] });
    await act(async () => void (await vi.advanceTimersByTimeAsync(60_000)));
    expect(vi.mocked(sendHeartbeat).mock.calls[2]![1]).toBeNull(); // nothing new: a plain heartbeat
  });
});

describe("Settings → Pexo", () => {
  it("is hidden when Pexo is off", () => {
    primePexo(off());
    render(<PexoSettings />);
    expect(screen.queryByTestId("pexo-settings")).toBeNull();
  });

  it("changes language, bubbles and notifications", async () => {
    primePexo(on());
    vi.mocked(updatePexoSettings).mockImplementation(async (input) => on(input));
    render(<PexoSettings />);
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Hinglish" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Hinglish" })).toHaveAttribute("aria-checked", "true"));
    expect(updatePexoSettings).toHaveBeenCalledWith({ language: "hi" });
    fireEvent.click(screen.getByRole("radio", { name: "Quiet" }));
    await waitFor(() => expect(updatePexoSettings).toHaveBeenCalledWith({ bubbles: "quiet" }));
    fireEvent.click(screen.getByRole("switch", { name: "Pexo notifications" }));
    await waitFor(() => expect(updatePexoSettings).toHaveBeenCalledWith({ notifications: false }));
  });
});
