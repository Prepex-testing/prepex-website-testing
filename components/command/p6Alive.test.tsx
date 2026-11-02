// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette, fuzzyScore } from "@/components/command/CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push }), usePathname: () => "/home" }));
const setTheme = vi.fn();
vi.mock("@/components/theme/ThemeProvider", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme }) }));
vi.mock("@/components/rituals/QuickLogFab", () => ({ QUICK_LOG_EVENT: "prepex:quick-log", isTypingTarget: (el: EventTarget | null) => el instanceof HTMLInputElement }));

beforeEach(() => vi.clearAllMocks());

describe("P6 command palette", () => {
  it("Ctrl+K opens it, typing narrows the list, Enter goes there and Escape closes it", () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId("command-palette")).toBeNull();
    act(() => void fireEvent.keyDown(window, { key: "k", ctrlKey: true }));
    const input = screen.getByTestId("palette-input");
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "ldrb" } });
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("Leaderboard");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/home/leaderboard");
    expect(screen.queryByTestId("command-palette")).toBeNull();

    act(() => void fireEvent.keyDown(window, { key: "/" }));
    fireEvent.keyDown(screen.getByTestId("palette-input"), { key: "Escape" });
    expect(screen.queryByTestId("command-palette")).toBeNull();
  });

  it("the theme action switches the theme, and Quick log opens the Quick Log hub", () => {
    const opened = vi.fn();
    window.addEventListener("prepex:quick-log", opened);
    render(<CommandPalette />);
    act(() => void fireEvent.keyDown(window, { key: "k", metaKey: true }));
    fireEvent.click(screen.getByTestId("palette-theme"));
    expect(setTheme).toHaveBeenCalledWith("dark");
    act(() => void fireEvent.keyDown(window, { key: "k", metaKey: true }));
    fireEvent.click(screen.getByTestId("palette-quick-log"));
    expect(opened).toHaveBeenCalled();
  });

  it("F starts a focus session and N opens My Notebooks, but not while typing", () => {
    render(
      <>
        <input data-testid="field" />
        <CommandPalette />
      </>,
    );
    fireEvent.keyDown(window, { key: "f" });
    expect(push).toHaveBeenLastCalledWith(expect.stringContaining("/focus"));
    fireEvent.keyDown(window, { key: "n" });
    expect(push).toHaveBeenLastCalledWith("/notebooks");
    push.mockClear();
    fireEvent.keyDown(screen.getByTestId("field"), { key: "f" });
    expect(push).not.toHaveBeenCalled();
  });

  it("fuzzy matching: letters in order, word starts score higher", () => {
    expect(fuzzyScore("nb", "My Notebooks")).not.toBeNull();
    expect(fuzzyScore("zz", "Home")).toBeNull();
    expect(fuzzyScore("set", "Settings")!).toBeGreaterThan(fuzzyScore("set", "Reset the timer")!);
  });
});

describe("P6 motion tokens", () => {
  it("the shared motion surfaces use the duration tokens, never a hardcoded duration", () => {
    const root = join(__dirname, "..", "..");
    const files = ["components/layout/AppShell.tsx", "components/motion/GlidePill.tsx", "components/command/CommandPalette.tsx", "components/ui/Modal.tsx", "components/ui/WhiteModal.tsx", "components/ui/Toast.tsx", "components/planner/Sheet.tsx", "components/ui/CoralButton.tsx", "components/ui/GhostButton.tsx", "components/ui/Button.tsx", "components/ui/PageLoader.tsx"];
    const offenders = files.filter((f) => /duration-\d|duration-\[\d|\bduration:\s*0?\.\d/.test(readFileSync(join(root, f), "utf-8")));
    expect(offenders).toEqual([]);
  });
});
