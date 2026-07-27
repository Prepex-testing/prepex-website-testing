"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong ${className}`}
    >
      <span className="hidden dark:block">
        <SunIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
      </span>
      <span className="dark:hidden">

        <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
      </span>
    </button>
  );
}