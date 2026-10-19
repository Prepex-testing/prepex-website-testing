// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";

vi.mock("next/navigation", () => ({ usePathname: () => "/goals" }));
vi.mock("@/lib/api/pilotFeedback", () => ({ getFeedbackConfig: vi.fn(), sendFeedback: vi.fn() }));
vi.mock("@/lib/feedback/screenshot", async (orig) => ({ ...(await orig<typeof import("@/lib/feedback/screenshot")>()), fileToDataUrl: vi.fn(), captureScreen: vi.fn(), canCaptureScreen: vi.fn() }));

import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { getFeedbackConfig, sendFeedback } from "@/lib/api/pilotFeedback";
import { canCaptureScreen, captureScreen, fileToDataUrl } from "@/lib/feedback/screenshot";

const on = () => vi.mocked(getFeedbackConfig).mockResolvedValue({ success: true, data: { enabled: true } });

async function openModal() {
  render(<FeedbackButton />);
  await userEvent.click(await screen.findByTestId("feedback-button"));
  return screen.getByTestId("feedback-text");
}

beforeEach(() => {
  vi.mocked(getFeedbackConfig).mockReset();
  vi.mocked(sendFeedback).mockReset();
  vi.mocked(fileToDataUrl).mockReset();
  vi.mocked(captureScreen).mockReset();
  vi.mocked(canCaptureScreen).mockReset().mockReturnValue(false);
});
afterEach(() => vi.useRealTimers());

describe("the button", () => {
  it("shows nothing while the flag is off, and nothing when the answer cannot be had", async () => {
    vi.mocked(getFeedbackConfig).mockResolvedValue({ success: true, data: { enabled: false } });
    const { unmount } = render(<FeedbackButton />);
    await waitFor(() => expect(getFeedbackConfig).toHaveBeenCalled());
    expect(screen.queryByTestId("feedback-button")).toBeNull();
    unmount();
    vi.mocked(getFeedbackConfig).mockRejectedValue(new ApiError(500, "down"));
    render(<FeedbackButton />);
    await waitFor(() => expect(getFeedbackConfig).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("feedback-button")).toBeNull();
  });

  it("when on it floats bottom-right (above the bottom bar on phones), and is hidden in focus screens", async () => {
    on();
    const { rerender } = render(<FeedbackButton />);
    const button = await screen.findByTestId("feedback-button");
    expect(button).toHaveTextContent("Feedback");
    expect(button.className).toContain("fixed");
    expect(button.className).toContain("right-4");
    expect(button.className).toContain("bottom-[calc(72px"); // clear of the bottom nav
    rerender(<FeedbackButton hidden />);
    expect(screen.queryByTestId("feedback-button")).toBeNull();
  });
});

describe("the form", () => {
  it("needs a few words; sends the text, the page the student is on, the rating and no screenshot; then says thank you", async () => {
    on();
    vi.mocked(sendFeedback).mockResolvedValue({ success: true, data: { feedback: { id: "f1" } } });
    const text = await openModal();
    expect(screen.getByTestId("feedback-send")).toBeDisabled();
    await userEvent.type(text, "hi");
    expect(screen.getByTestId("feedback-send")).toBeDisabled(); // two characters is not enough
    await userEvent.type(text, "  the goals page is slow  ");
    await userEvent.click(screen.getByTestId("feedback-star-4"));
    expect(screen.getByTestId("feedback-star-4")).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(screen.getByTestId("feedback-thanks")).toBeInTheDocument());
    expect(sendFeedback).toHaveBeenCalledWith({ screen: "/goals", feedbackText: "hi  the goals page is slow", rating: 4 });
    await userEvent.click(screen.getByTestId("feedback-done"));
    await waitFor(() => expect(screen.queryByTestId("feedback-text")).toBeNull());
  });

  it("the rating is optional and a tap on the same star takes it back", async () => {
    on();
    vi.mocked(sendFeedback).mockResolvedValue({ success: true, data: { feedback: { id: "f1" } } });
    const text = await openModal();
    await userEvent.type(text, "no rating here");
    await userEvent.click(screen.getByTestId("feedback-star-2"));
    await userEvent.click(screen.getByTestId("feedback-star-2"));
    await userEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith({ screen: "/goals", feedbackText: "no rating here" }));
  });

  it("a picture from the device is attached (downscaled by the helper), shown, removable, and sent", async () => {
    on();
    vi.mocked(fileToDataUrl).mockResolvedValue("data:image/jpeg;base64,QUJD");
    vi.mocked(sendFeedback).mockResolvedValue({ success: true, data: { feedback: { id: "f1" } } });
    const text = await openModal();
    await userEvent.type(text, "see the screenshot");
    const file = new File(["x"], "shot.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("feedback-file"), { target: { files: [file] } });
    expect(await screen.findByTestId("feedback-shot")).toBeInTheDocument();
    expect(fileToDataUrl).toHaveBeenCalledWith(file);
    await userEvent.click(screen.getByTestId("feedback-shot-remove"));
    expect(screen.queryByTestId("feedback-shot")).toBeNull();
    fireEvent.change(screen.getByTestId("feedback-file"), { target: { files: [file] } });
    await screen.findByTestId("feedback-shot");
    await userEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(sendFeedback).toHaveBeenCalledWith({ screen: "/goals", feedbackText: "see the screenshot", screenshot: "data:image/jpeg;base64,QUJD" }));
  });

  it("Capture my screen only appears where the browser can do it, and a cancelled picker attaches nothing", async () => {
    on();
    const { unmount } = render(<FeedbackButton />);
    await userEvent.click(await screen.findByTestId("feedback-button"));
    expect(screen.queryByTestId("feedback-capture")).toBeNull(); // phones
    unmount();

    vi.mocked(canCaptureScreen).mockReturnValue(true);
    vi.mocked(captureScreen).mockResolvedValue(null);
    render(<FeedbackButton />);
    await userEvent.click(await screen.findByTestId("feedback-button"));
    await userEvent.click(screen.getByTestId("feedback-capture"));
    await waitFor(() => expect(captureScreen).toHaveBeenCalled());
    expect(screen.queryByTestId("feedback-shot")).toBeNull();
  });

  it("a picture that cannot be used shows why and the form stays usable", async () => {
    on();
    vi.mocked(fileToDataUrl).mockRejectedValue(new Error("Please choose a PNG, JPEG or WebP image."));
    await openModal();
    fireEvent.change(screen.getByTestId("feedback-file"), { target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] } });
    expect(await screen.findByTestId("feedback-error")).toHaveTextContent("PNG, JPEG or WebP");
    expect(screen.getByTestId("feedback-attach")).toBeEnabled();
  });

  it("a server refusal (the hourly limit) is shown, the words are kept, and the student can try again", async () => {
    on();
    vi.mocked(sendFeedback).mockRejectedValueOnce(new ApiError(429, "You have sent a lot of feedback in the last hour. Thank you! Please try again a little later.")).mockResolvedValueOnce({ success: true, data: { feedback: { id: "f1" } } });
    const text = await openModal();
    await userEvent.type(text, "my long note");
    await userEvent.click(screen.getByTestId("feedback-send"));
    expect(await screen.findByTestId("feedback-error")).toHaveTextContent("a lot of feedback");
    expect(screen.getByTestId("feedback-text")).toHaveValue("my long note");
    await userEvent.click(screen.getByTestId("feedback-send"));
    await waitFor(() => expect(screen.getByTestId("feedback-thanks")).toBeInTheDocument());
  });

  it("the text is capped at 2000 characters and the counter shows it", async () => {
    on();
    const text = await openModal();
    fireEvent.change(text, { target: { value: "a".repeat(2500) } });
    expect((text as HTMLTextAreaElement).value).toHaveLength(2000);
    expect(screen.getByText("2000 / 2000")).toBeInTheDocument();
  });

  it("Cancel closes it without sending anything", async () => {
    on();
    const text = await openModal();
    await userEvent.type(text, "never mind");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByTestId("feedback-text")).toBeNull());
    expect(sendFeedback).not.toHaveBeenCalled();
  });
});
