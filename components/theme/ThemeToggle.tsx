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
      className={`
        flex h-11 w-11 items-center justify-center rounded-full
        transition-colors
        ${
          isDark
            ? "bg-slate-800 text-white hover:bg-slate-700"
            : "bg-white text-[#1B245A] hover:bg-tint-strong"
        }
        ${className}
      `}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}