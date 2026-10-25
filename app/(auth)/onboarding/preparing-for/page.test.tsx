// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PreparingForPage from "./page";
import { OnboardingDraftProvider } from "@/lib/onboarding/draft-context";
import { loadDraft } from "@/lib/onboarding/draft";
import { targetExamsFor } from "@/lib/onboarding/goal";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("@/lib/auth/session", () => ({ getStoredUser: () => ({ id: "student-1", fullName: "Rohan" }) }));
vi.mock("@/lib/api/onboarding", () => ({ getOnboardingProgress: () => Promise.resolve({ data: { profile: null } }) }));
vi.mock("@/lib/onboarding/telemetry", () => ({ trackOnboarding: vi.fn() }));

const exam = (id: string, code: string, name: string) => ({ id, code, name, defaultExamDate: null, isActive: true });
let EXAMS = [exam("e-main", "JEE_MAIN", "JEE Main"), exam("e-adv", "JEE_ADVANCED", "JEE Advanced"), exam("e-both", "JEE_AND_NEET", "Both JEE and NEET")];
vi.mock("@/lib/api/dashboard", () => ({ getExams: () => Promise.resolve({ success: true, data: EXAMS }) }));

function renderPage() {
  return render(
    <OnboardingDraftProvider>
      <PreparingForPage />
    </OnboardingDraftProvider>,
  );
}

// The draft is written to storage a moment after each change, and straight away when the page is hidden.
const savedDraft = () => {
  window.dispatchEvent(new Event("pagehide"));
  return loadDraft("student-1")!;
};

const cardTitles = () => screen.getAllByRole("button").filter((b) => b.getAttribute("data-testid") !== "onboarding-next").map((b) => b.textContent ?? "");

beforeEach(() => {
  window.localStorage.clear();
  push.mockClear();
  EXAMS = [exam("e-main", "JEE_MAIN", "JEE Main"), exam("e-adv", "JEE_ADVANCED", "JEE Advanced"), exam("e-both", "JEE_AND_NEET", "Both JEE and NEET")];
});
afterEach(cleanup);

describe("Step 1: I'm preparing for", () => {
  it("shows the four goals in order, and never 'Both JEE and NEET'", async () => {
    renderPage();
    await screen.findByText("JEE Main");
    const titles = cardTitles();
    expect(titles).toHaveLength(4);
    expect(titles[0]).toContain("JEE Main");
    expect(titles[1]).toContain("JEE Advanced");
    expect(titles[2]).toContain("Both JEE Main + Advanced");
    expect(titles[3]).toContain("NEET");
    expect(screen.queryByText(/Both JEE and NEET/)).not.toBeInTheDocument();
  });

  it("marks NEET as coming soon, and not selectable, while no NEET exam exists", async () => {
    renderPage();
    await screen.findByText("JEE Main");
    const neet = screen.getByRole("button", { name: /NEET/ });
    expect(neet).toBeDisabled();
    expect(neet).toHaveTextContent("Coming soon");
  });

  it("selects NEET when the NEET exam exists", async () => {
    EXAMS = [...EXAMS, exam("e-neet", "NEET", "NEET")];
    renderPage();
    await screen.findByText("AIIMS and medical colleges");
    const neet = screen.getByRole("button", { name: /NEET/ });
    expect(neet).toBeEnabled();
    fireEvent.click(neet);
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(push).toHaveBeenCalled();
    const saved = savedDraft();
    expect(saved.goal.option).toBe("NEET");
    expect(targetExamsFor({ code: saved.goal.examCode!, name: saved.goal.examName! })).toEqual(["NEET"]);
  });

  it("'Both JEE Main + Advanced' saves target exams JEE_MAIN + JEE_ADVANCED and highlights only that card", async () => {
    renderPage();
    await screen.findByText("The full JEE journey");
    fireEvent.click(screen.getByRole("button", { name: /Both JEE Main \+ Advanced/ }));
    fireEvent.click(screen.getByTestId("onboarding-next"));

    const saved = savedDraft();
    expect(saved.goal.option).toBe("JEE_BOTH");
    expect(targetExamsFor({ code: saved.goal.examCode!, name: saved.goal.examName! })).toEqual(["JEE_MAIN", "JEE_ADVANCED"]);
    expect(saved.goal.examName).not.toMatch(/neet/i); // no Biology downstream
  });

  it("starts with JEE Main selected so Next is one tap away", async () => {
    renderPage();
    await screen.findByText("JEE Main");
    expect(screen.getByTestId("onboarding-next")).toBeEnabled();
  });
});
