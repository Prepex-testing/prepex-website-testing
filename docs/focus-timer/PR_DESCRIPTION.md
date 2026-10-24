# refactor(focus-timer): single new timer, wired across all entry points, auto-log + auto-mark-done

Website half. Companion: `prepex-backend-testing`, branch `claude/focus-timer-unify` (the audit note is `docs/focus-timer-audit.md` there).
Merge the backend PR first: this one calls `/api/focus-sessions/intent`, the new stop payload and the `progressPercent` field.

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | `docs/focus-timer-audit.md` with the full legacy inventory | ✅ (backend repo) |
| 2 | Legacy components, routes and endpoints deleted; TypeScript compiles | ✅ `tsc`, `next build` |
| 3 | Legacy tables kept `@deprecated`, backfill migration | ✅ `time_trackers` copied into `study_sessions` with `source = 'LEGACY_MIGRATION'` (tested on scratch data) |
| 4 | One `startFocusSession(intent)` module, no other timer-opening path | ✅ `lib/focus/startFocusSession.ts`; links use `focusSessionHref` from the same file; grep is clean |
| 5 | Every Phase E CTA rewired, smoke checklist filled | ✅ see the table below and the checklist in the backend audit note |
| 6 | Deeplinks parse origin + id; legacy URLs 301 | ✅ unit + e2e |
| 7 | Timer matches the Phase C spec; light + dark | ✅ verified at 390px and 1280px, light and dark. 360px and 414px were not run separately. |
| 8 | Session start persists the full intent | ✅ `focus_sessions` columns + `intent` JSON |
| 9 | Secondary log by task type | ✅ practice, revision, mock review (unit), chapter minutes |
| 10 | Origin updated | ✅ plan task, backlog item / task, weekly goal |
| 11 | Wrong answers feed the Mistake Notebook | ✅ e2e |
| 12 | Revision advances with SM-2 from the confidence rating | ✅ unit + e2e |
| 13 | Streak and weekly goal counters | ✅ the streak counts focus sittings; goal progress comes from the ledger; goal-hit toast |
| 14 | One transaction, retry on failure | ✅ real-transaction rollback test; client keeps and re-sends a failed save |
| 15 | Telemetry at every step | ✅ server log events + client `prepex:telemetry` mirror |
| 16 | Flag defaults | ✅ all three on |
| 17 | No Hinglish in the timer path | ✅ grep clean |
| 18 | Migration applied, tests, lint, build green | ✅ 383 website tests, 927 backend tests, 0 lint errors, `next build` |
| 19 | Unit tests (SM-2, intent parsing, routing by task type, rollback) | ✅ |
| 20 | End-to-end smoke (a–e) | ✅ `e2e/focus-timer.spec.ts`, 9 tests × (390px, 1280px) |

## What a judge taps on 29 Oct

Home → today's first task → **Start** → the timer opens full screen with subject, chapter, topic and length already filled in and
"From today's plan" on top → **Start** → run it → **End** → pick a mood, "Yes, a win" → **Save** → the screen lists what was saved
("Marked your planner task as done", lecture minutes on the chapter), shows the streak and shield, and offers a one-tap share card →
back on Home the task is ticked, and Analytics and the study log already include the minutes.

## Rewired CTAs

| Where | Was | Now dispatches |
|---|---|---|
| Planner card, Start (new learning) — `PlanTaskRow`, `TaskRow` | `/home/session?taskId=` | `planner` + task id |
| Planner card, Start Revision | `/revision-session?taskId=` | `planner` + task id, `revision` |
| Practice → "Use my own content" (new) | — | `practice_own_content_fallback` + task id, `practice` |
| Practice with no Prepex questions (new) | — | same, with the "No Prepex questions…" notice |
| Revision tab, Start | `/revision-session?taskId=` | `revision_tab` + task id |
| Backlog items and planner backlog tasks, Start (new) | — | `backlog_tab` + id |
| Practice log, "Start a timed session" (new) | — | `practice_tab`, `practice`, 30 |
| Mistake notebook, "Practice this topic" (new) | — | `mistake_notebook` + id, `practice`, 30 |
| Syllabus list + chapter page, "Study this chapter" (new) | — | `syllabus_overview` + chapter, `self_study`, 60 |
| Home "Quick Focus" tile | a dead modal stub, then a task-creating modal | `home_quick_tile` (now labelled "Focus") |
| Weekly goals, "Start now" (new) | — | `weekly_goals` + goal id |
| Bottom nav, sidebar and Study tabs "Focus" | `/focus` | `standalone` |
| Legacy URLs `/home/session`, `/revision-session`, `/focus/legacy`, `/timer/old`, `/focus` | the old timer | 301 → `/focus/start` (a task id is kept) |

## Screenshots (`docs/focus-timer/screenshots/`)

Light, 390px: `mobile-focus-1-setup-pomodoro`, `2-setup-stopwatch`, `3-setup-countdown`, `4-running-pomodoro`, `5-end-session`,
`6-done`, `7-end-practice-sheet`. Dark, 390px: `mobile-focus-dark-1` to `6`. Desktop: `desktop-focus-1`, `6`.
(The orange "Insight" pill in the corner is the Next.js dev overlay.)

## Things to know

- **Planner-v2's entry contract** was not available: no `claude/planner-v2` branch exists on the remote. `startFocusSession` and the
  `/focus/start?origin=…&id=…` params are the contract; planner-v2 should import them.
- `AddCustomTaskModal`'s `quickFocus` mode is now unused (`// TODO(focus-timer-v2)`); it belongs to the planner window.
- No sound files and no Capacitor plugin exist in the repo, so sounds are generated in the browser and app blocking is a reminder on
  the web (and calls an `AppBlock` plugin on Android when one is installed).
- C8 (podmates strip) is not built: these repos have no pods.
- `next build` prints a one-time Next.js security-advisory prompt; the version bump was not part of this PR.
