// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn() }));
const reduced = vi.hoisted(() => ({ on: false }));
vi.mock("motion/react", async (orig) => ({ ...(await orig<typeof import("motion/react")>()), useReducedMotion: () => reduced.on }));

import { Pexo } from "@/components/pexo/Pexo";
import { FormReveal, revealFor } from "@/components/pexo/FormReveal";
import { hasLayer, PEXO_FORMS } from "@/components/pexo/forms";
import type { PexoState } from "@/lib/api/pexo";
import { pexoHasMark, primePexo, resetPexo, takePexoBatch } from "@/lib/pexo/store";

const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 2, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: [], marks: {}, today: "2026-11-12", daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, ...over });
const layers = (el: Element) => [...el.querySelectorAll("[data-form-layer]")].map((n) => n.getAttribute("data-form-layer"));

beforeEach(() => {
  resetPexo();
  reduced.on = false;
  document.documentElement.setAttribute("data-motion", "reduce");
});
afterEach(cleanup);

describe("the six forms (B1, B2)", () => {
  it("each form adds a layer to the ones below it", () => {
    expect(PEXO_FORMS.map((f) => PEXO_FORMS.filter((l) => hasLayer(f, l)).length)).toEqual([1, 2, 3, 4, 5, 6]);
    const { container, rerender } = render(<Pexo form="aspirant" size={96} />);
    expect(layers(container)).toEqual(["sprout"]);
    rerender(<Pexo form="solver" size={96} />);
    expect(layers(container)).toEqual(expect.arrayContaining(["sprout", "glasses", "lamp"]));
    rerender(<Pexo form="iitian" size={96} />);
    expect(layers(container)).toEqual(expect.arrayContaining(["cape", "hood", "backpack", "sprout", "glasses", "straps", "strings", "lamp"]));
    // no institute name or logo anywhere: the hoodie is plain
    expect(container.querySelector("text")).toBeNull();
  });

  it("accessories still sit on top; a cap covers the sprout; the lamp only when Pexo holds nothing else; 24 px keeps it simple", () => {
    const { container, rerender } = render(<Pexo form="ranker" size={96} accessory="cap" />);
    expect(layers(container)).not.toContain("sprout");
    const svg = container.querySelector("svg")!;
    const order = [...svg.querySelectorAll("[data-form-layer], [data-accessory]")].map((n) => n.getAttribute("data-form-layer") ?? `acc:${n.getAttribute("data-accessory")}`);
    expect(order.at(-1)).toBe("acc:cap");
    rerender(<Pexo form="grinder" size={96} mood="focused" />);
    expect(layers(container)).not.toContain("lamp");
    rerender(<Pexo form="iitian" size={24} />);
    expect(layers(container)).toEqual(expect.arrayContaining(["cape", "hood", "sprout", "glasses"]));
    expect(layers(container)).not.toContain("straps");
  });

  it("without a form prop, Pexo wears the student's own form", () => {
    primePexo(on({ form: "topper" }));
    const { container } = render(<Pexo size={48} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-form", "topper");
  });
});

describe("the reveal (B3)", () => {
  it("decides: none for a new Aspirant, ONE reveal of the current form for an existing student, then once per new band", () => {
    const marks = new Set<string>();
    const has = (m: string) => marks.has(m);
    expect(revealFor("aspirant", has)).toBeNull();
    expect(revealFor("ranker", has)).toEqual({ from: "aspirant", to: "ranker" });
    marks.add("form.init");
    for (const f of ["aspirant", "grinder", "solver", "ranker"]) marks.add(`form.seen.${f}`);
    expect(revealFor("ranker", has)).toBeNull();
    expect(revealFor("topper", has)).toEqual({ from: "ranker", to: "topper" });
  });

  it("shows the moment with form.reveal and the band's line, once, and records the bands as seen", async () => {
    primePexo(on({ form: "solver" }));
    const { unmount } = render(<FormReveal />);
    const moment = await screen.findByTestId("form-reveal");
    expect(moment).toHaveAttribute("data-form", "solver");
    expect(screen.getAllByTestId("form-reveal-line").map((l) => l.textContent)).toEqual(["I changed. New look for a new title: Solver.", "Solver. Glasses on. Questions don't scare us anymore."]);
    expect(pexoHasMark("form.seen.solver")).toBe(true);
    expect(pexoHasMark("form.seen.grinder")).toBe(true);
    fireEvent.click(screen.getByTestId("form-reveal-close"));
    unmount();
    render(<FormReveal />);
    expect(screen.queryByTestId("form-reveal")).toBeNull();
    expect(takePexoBatch()!.marks).toEqual(expect.arrayContaining(["form.init", "form.seen.solver"]));
  });

  it("waits while a level-up moment is open; reduced motion shows the new form straight away", async () => {
    reduced.on = true;
    primePexo(on({ form: "grinder", marks: { "form.init": "2026-11-01", "form.seen.aspirant": "2026-11-01" } }));
    render(<FormReveal />);
    act(() => void window.dispatchEvent(new CustomEvent("prepex:reward-moment", { detail: true })));
    // the effect ran before the event: it may already show; close it and confirm a busy layer never opens another
    expect(await screen.findByTestId("form-reveal-new")).toBeInTheDocument();
    expect(screen.getByTestId("form-reveal-new").querySelector("svg")).toHaveAttribute("data-form", "grinder");
  });
});
