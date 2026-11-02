"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isTypingTarget, QUICK_LOG_EVENT } from "@/components/rituals/QuickLogFab";
import { useTheme } from "@/components/theme/ThemeProvider";
import { focusSessionHref } from "@/lib/focus/startFocusSession";

type Command = { id: string; label: string; hint: string; keywords?: string; run: () => void };

/** Subsequence match with a small bonus for word starts; null when the letters are not all there in order. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let at = -1;
  for (const ch of q) {
    if (ch === " ") continue;
    const i = t.indexOf(ch, at + 1);
    if (i < 0) return null;
    score += i === at + 1 ? 3 : 1;
    if (i === 0 || t[i - 1] === " ") score += 2;
    at = i;
  }
  return score;
}

/**
 * P6 command palette: Ctrl/Cmd+K (or "/") anywhere opens it; type to jump to a screen or run an action. Arrow keys
 * move, Enter runs, Escape closes and puts focus back where it was. Global keys: F starts a focus session, N opens My
 * Notebooks to add a mistake (L, Quick Log, belongs to the Quick Log button).
 */
export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const go = useCallback((href: string) => () => router.push(href), [router]);
  const commands = useMemo<Command[]>(
    () => [
      { id: "home", label: "Home", hint: "Go to", run: go("/home") },
      { id: "focus", label: "Start a focus session", hint: "F", keywords: "timer study", run: go(focusSessionHref({ originSource: "standalone" })) },
      { id: "quick-log", label: "Quick log", hint: "L", keywords: "log study practice", run: () => window.dispatchEvent(new CustomEvent(QUICK_LOG_EVENT)) },
      { id: "notebooks", label: "My Notebooks", hint: "N", keywords: "mistakes notes", run: go("/notebooks") },
      { id: "sessions", label: "Study sessions", hint: "Go to", run: go("/sessions") },
      { id: "logs", label: "Logs: revision, practice, backlog, mocks", hint: "Go to", run: go("/logs") },
      { id: "planner", label: "Planner", hint: "Go to", keywords: "plan today", run: go("/planner") },
      { id: "goals", label: "Weekly goals", hint: "Go to", run: go("/goals") },
      { id: "syllabus", label: "Syllabus", hint: "Go to", keywords: "chapters", run: go("/syllabus") },
      { id: "practice", label: "Practice", hint: "Go to", keywords: "questions", run: go("/practice") },
      { id: "library", label: "Resource Library", hint: "Go to", keywords: "books notes chapter", run: go("/home/resource-library") },
      { id: "analytics", label: "Analytics", hint: "Go to", keywords: "stats dashboard", run: go("/analytics") },
      { id: "calendar", label: "Calendar", hint: "Go to", run: go("/calendar") },
      { id: "leaderboard", label: "Leaderboard", hint: "Go to", keywords: "rank xp", run: go("/home/leaderboard") },
      { id: "review", label: "Weekly review", hint: "Go to", keywords: "sunday", run: go("/home/review") },
      { id: "streak", label: "Streak", hint: "Go to", run: go("/home/streak") },
      { id: "profile", label: "Profile", hint: "Go to", run: go("/profile") },
      { id: "settings", label: "Settings", hint: "Go to", keywords: "appearance theme motion", run: go("/profile/settings") },
      { id: "theme", label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode", hint: "Theme", keywords: "dark light", run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") },
    ],
    [go, resolvedTheme, setTheme],
  );

  const results = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => ({ c, s: fuzzyScore(query, `${c.label} ${c.keywords ?? ""}`) }))
      .filter((x): x is { c: Command; s: number } => x.s !== null)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [commands, query]);

  const show = useCallback(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setIndex(0);
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    returnTo.current?.focus?.();
  }, []);
  const run = useCallback(
    (c: Command | undefined) => {
      if (!c) return;
      setOpen(false);
      c.run();
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else show();
        return;
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (e.key === "/") {
        e.preventDefault();
        show();
      } else if (k === "f") {
        e.preventDefault();
        router.push(focusSessionHref({ originSource: "standalone" }));
      } else if (k === "n") {
        e.preventDefault();
        router.push("/notebooks");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, close, router]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open) return null;
  const active = Math.min(index, Math.max(0, results.length - 1));

  return (
    <div className="motion-backdrop palette-backdrop fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={close} data-testid="command-palette">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="motion-pop w-full max-w-lg overflow-hidden rounded-[var(--radius-sheet)] border border-border-subtle bg-surface shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-4">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => (setQuery(e.target.value), setIndex(0))}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") (e.preventDefault(), setIndex((i) => Math.min(i + 1, results.length - 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setIndex((i) => Math.max(i - 1, 0)));
              else if (e.key === "Enter") (e.preventDefault(), run(results[active]));
              else if (e.key === "Escape") (e.preventDefault(), close());
            }}
            placeholder="Go to a screen or run an action"
            aria-label="Search commands"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active]!.id}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
            data-testid="palette-input"
          />
          <kbd className="hidden rounded-md border border-border-subtle px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
        </div>
        <ul id="palette-results" role="listbox" aria-label="Commands" className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-muted">Nothing matches that.</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`palette-${c.id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(c)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors ${i === active ? "bg-tint-strong text-ink" : "text-body-text dark:text-ink"}`}
              data-testid={`palette-${c.id}`}
            >
              <span className="min-w-0 truncate">{c.label}</span>
              <span className="shrink-0 text-[12px] font-medium text-muted">{c.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
