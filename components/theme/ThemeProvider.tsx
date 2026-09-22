"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { THEME_STORAGE_KEY } from "@/components/theme/constants";
import type { ResolvedTheme, Theme } from "@/components/theme/constants";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Same-tab writes don't fire the native `storage` event (only other tabs get
// that), so setTheme dispatches this too — it's what tells the
// useSyncExternalStore subscription below to re-read localStorage.
const THEME_CHANGE_EVENT = "prepex-theme-change";

function getStoredThemeSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall back to system.
  }
  return "system";
}

function getStoredThemeServerSnapshot(): Theme {
  return "system";
}

function subscribeToStoredTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — theme just won't persist across reloads.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemPrefersDarkSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getSystemPrefersDarkServerSnapshot() {
  return false;
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return getSystemPrefersDarkSnapshot() ? "dark" : "light";
}

/**
 * Applies a theme change as one cross-fade of the whole page.
 *
 * Left to per-element CSS transitions, a theme flip fades every element on
 * its own clock — and an element that inherits its colour re-targets its fade
 * from the parent's mid-fade colour each frame, so nested cards (e.g. the Home
 * streak card) visibly finish after their neighbours. The View Transitions
 * API instead snapshots the old page, applies the new theme in one commit,
 * and cross-fades the two snapshots, so nothing can lag behind.
 *
 * `theme-switching` switches element transitions off for the duration, so the
 * "new" snapshot is taken of final colours rather than of the first frame of
 * each element's own fade. Browsers without the API (or with reduced motion)
 * get the same instant, all-at-once switch.
 */
function switchTheme(next: Theme) {
  const root = document.documentElement;
  const apply = () => {
    // Set here as well as in ThemeProvider's layout effect, so the attribute
    // is guaranteed to be in place when the browser captures the new state.
    root.setAttribute("data-theme", resolveTheme(next));
    flushSync(() => writeStoredTheme(next));
  };

  root.classList.add("theme-switching");
  const done = () => {
    // One frame later, so restoring transitions can't animate the switch.
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion) {
    apply();
    done();
    return;
  }

  document.startViewTransition(apply).finished.finally(done);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToStoredTheme,
    getStoredThemeSnapshot,
    getStoredThemeServerSnapshot,
  );
  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemPrefersDarkSnapshot,
    getSystemPrefersDarkServerSnapshot,
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  // useLayoutEffect (not useEffect) so this attribute flip lands in the same
  // pre-paint commit as consumers' own isDark-driven className changes —
  // otherwise data-theme (and everything keyed off it via CSS variables /
  // `dark:`) updates one frame after JS-driven colors, and the two halves of
  // the page visibly desync during a theme toggle.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);

    // Next's viewport.themeColor only follows OS-level prefers-color-scheme,
    // so it goes stale the moment someone picks a theme in-app that differs
    // from their system setting. Force both media-variant meta tags to match
    // what's actually rendered.
    const themeColor = resolvedTheme === "dark" ? "#000000" : "#faf7f2";
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", themeColor));
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => switchTheme(next), []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
