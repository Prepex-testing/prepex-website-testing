"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
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

  useEffect(() => {
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

  const setTheme = useCallback((next: Theme) => writeStoredTheme(next), []);

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
