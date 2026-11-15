// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { sendFeedback } from "@/lib/api/feedback";

/** Launch step 2 (B1): Report a bug / Share an idea, with Pexo's feedback.prompt and feedback.thanks lines. */
vi.mock("next/navigation", () => ({ usePathname: () => "/focus/start", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/feedback", async (orig) => ({ ...(await orig<typeof import("@/lib/api/feedback")>()), sendFeedback: vi.fn(async () => ({ success: true, data: { id: "f1" } })) }));

describe("feedback sheet", () => {
  it("Pexo asks, the student writes, the screen is attached, and Pexo thanks them", async () => {
    render(<FeedbackSheet open onClose={vi.fn()} />);
    expect(screen.getByTestId("feedback-prompt")).toHaveTextContent("Found a bug or have an idea?");
    expect(screen.getByTestId("feedback-send")).toBeDisabled();
    await userEvent.click(screen.getByTestId("feedback-type-idea"));
    await userEvent.type(screen.getByTestId("feedback-message"), "A dark planner please");
    const shot = new File([new Uint8Array([0xff, 0xd8, 0xff, 0])], "s.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByTestId("feedback-screenshot"), shot);
    await userEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith({ type: "idea", message: "A dark planner please", route: "/focus/start", screenshot: shot }));
    expect(await screen.findByTestId("feedback-thanks")).toHaveTextContent("Thanks. That goes straight to the team.");
  });

  it("refuses a screenshot over 15 MB before sending anything", async () => {
    render(<FeedbackSheet open onClose={vi.fn()} />);
    const big = new File([new Uint8Array(1)], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 16 * 1024 * 1024 });
    await userEvent.upload(screen.getByTestId("feedback-screenshot"), big);
    expect(screen.getByRole("alert")).toHaveTextContent(/over 15 MB/);
  });
});
