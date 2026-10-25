// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepFooter } from "@/components/onboarding/StepFooter";

afterEach(cleanup);

describe("StepFooter", () => {
  it("puts a fixed-width Back beside a Next that takes the rest of the row", () => {
    render(<StepFooter backHref="/onboarding/preparing-for" onNext={() => {}} />);
    const back = screen.getByTestId("onboarding-back");
    const next = screen.getByTestId("onboarding-next");

    expect(back).toHaveAttribute("href", "/onboarding/preparing-for");
    // Back keeps its width and never grows; Next fills what is left.
    expect(back.className).toMatch(/shrink-0/);
    expect(back.className).toMatch(/min-\[380px\]:min-w-\[120px\]/);
    expect(back.className).toMatch(/\bmin-w-\[96px\]/);
    expect(back.className).not.toMatch(/\bflex-1\b|\bw-full\b/);
    expect(next.className).toMatch(/\bflex-1\b/);
    expect(next.className).not.toMatch(/\bw-full\b/);
    // Back is quiet (outlined), Next is the filled call to action.
    expect(back.className).toMatch(/bg-transparent/);
    expect(next.className).toMatch(/bg-cta/);
  });

  it("makes both buttons at least 56px tall (well over the 44px tap target)", () => {
    render(<StepFooter backHref="/x" onNext={() => {}} />);
    for (const id of ["onboarding-back", "onboarding-next"]) {
      expect(screen.getByTestId(id).className).toMatch(/min-h-14/); // 3.5rem = 56px
    }
  });

  it("has no Back on the first screen, so Next spans the row", () => {
    render(<StepFooter onNext={() => {}} />);
    expect(screen.queryByTestId("onboarding-back")).not.toBeInTheDocument();
    expect(screen.getByTestId("onboarding-next").className).toMatch(/\bflex-1\b/);
  });

  it("keeps Next off while the screen is invalid, and says what is missing", () => {
    const onNext = vi.fn();
    render(<StepFooter backHref="/x" onNext={onNext} nextDisabled hint="Add your name." />);
    const next = screen.getByTestId("onboarding-next");
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Add your name.");
  });

  it("calls onNext, and shows Saving… with both buttons locked while busy", () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    const { rerender } = render(<StepFooter onBack={onBack} onNext={onNext} nextLabel="Continue" />);
    fireEvent.click(screen.getByText("Continue"));
    expect(onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("onboarding-back"));
    expect(onBack).toHaveBeenCalledTimes(1);

    rerender(<StepFooter onBack={onBack} onNext={onNext} busy />);
    expect(screen.getByTestId("onboarding-next")).toHaveTextContent("Saving…");
    expect(screen.getByTestId("onboarding-next")).toBeDisabled();
    expect(screen.getByTestId("onboarding-back")).toBeDisabled();
  });

  it("can pin itself to the bottom of a long screen", () => {
    render(<StepFooter backHref="/x" onNext={() => {}} sticky />);
    expect(screen.getByTestId("step-footer").className).toMatch(/sticky/);
  });
});
