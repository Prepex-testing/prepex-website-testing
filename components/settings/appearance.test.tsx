// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { MOTION_STORAGE_KEY, NO_FLASH_THEME_SCRIPT } from "@/components/theme/constants";

const setTheme = vi.fn();
vi.mock("@/components/theme/ThemeProvider", () => ({ useTheme: () => ({ theme: "light", resolvedTheme: "light", setTheme }) }));

const mediaMatches = (dark: boolean, reduce = false) =>
  vi.fn((q: string) => ({ matches: q.includes("dark") ? dark : q.includes("reduce") ? reduce : false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("P6 part C: light by default, Settings → Appearance", () => {
  it("a new device paints light even when the OS is dark; a stored choice wins; System follows the OS", () => {
    vi.stubGlobal("matchMedia", mediaMatches(true));
    new Function(NO_FLASH_THEME_SCRIPT)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    localStorage.setItem("prepex-theme", "system");
    new Function(NO_FLASH_THEME_SCRIPT)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    localStorage.setItem("prepex-theme", "light");
    new Function(NO_FLASH_THEME_SCRIPT)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    vi.unstubAllGlobals();
  });

  it("picks the theme and the motion level; Lite is remembered and applied at once; reduce-motion always wins", () => {
    vi.stubGlobal("matchMedia", mediaMatches(false));
    render(<AppearanceSettings />);
    fireEvent.click(screen.getByTestId("theme-dark"));
    expect(setTheme).toHaveBeenCalledWith("dark");
    fireEvent.click(screen.getByTestId("motion-lite"));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe("lite");
    expect(document.documentElement.getAttribute("data-motion")).toBe("lite");
    fireEvent.click(screen.getByTestId("motion-auto"));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
    vi.stubGlobal("matchMedia", mediaMatches(false, true));
    fireEvent.click(screen.getByTestId("motion-full"));
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduce");
    vi.unstubAllGlobals();
  });
});
