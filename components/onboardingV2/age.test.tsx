// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AgeStep } from "@/components/onboardingV2/OnboardingCanvas";
import { emptyAnswers } from "@/lib/onboardingV2/canvas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

/** Launch step 2 (A2): the age question; under 18 gets an optional parent e-mail, 18+ moves straight on. */
describe("the age question", () => {
  it("offers 13–14, 15, 16, 17 and 18+; 18+ moves on with no parent e-mail", async () => {
    const onDone = vi.fn();
    render(<AgeStep a={emptyAnswers("Asha")} onMinor={vi.fn()} onDone={onDone} />);
    for (const b of ["13-14", "15", "16", "17", "18+"]) expect(screen.getByTestId(`onb-age-${b}`)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("onb-age-18+"));
    expect(onDone).toHaveBeenCalledWith("18+", "");
  });

  it("under 18: Pexo's minor line, then an optional parent e-mail that can be skipped or checked", async () => {
    const onDone = vi.fn();
    const onMinor = vi.fn();
    render(<AgeStep a={emptyAnswers("Asha")} onMinor={onMinor} onDone={onDone} />);
    await userEvent.click(screen.getByTestId("onb-age-16"));
    expect(onMinor).toHaveBeenCalled();
    expect(screen.getByTestId("onb-age-next")).toHaveTextContent("Skip for now");
    await userEvent.type(screen.getByTestId("onb-parent-email"), "not an email");
    expect(screen.getByTestId("onb-age-next")).toBeDisabled();
    await userEvent.clear(screen.getByTestId("onb-parent-email"));
    await userEvent.type(screen.getByTestId("onb-parent-email"), "mom@example.com");
    await userEvent.click(screen.getByTestId("onb-age-next"));
    expect(onDone).toHaveBeenCalledWith("16", "mom@example.com");
  });
});
