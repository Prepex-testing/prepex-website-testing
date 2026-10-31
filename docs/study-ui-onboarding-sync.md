# Study UI desktop pass, onboarding sync, edit timetable

Branches: website `claude/study-ui-v1`, backend `claude/onboarding-sync-v1`. Resume from this file if the session dies.
Hard rule: show only data that exists in the backend or can be computed from it. If a metric does not exist, the element is left out.

## Status

| Step | State |
|---|---|
| Doc written | done |
| Part 2 backend (onboarding manual flag, backfill, syllabus summary, tests) | done, merged (backend PR #42) |
| Part 3 backend (`refreshFromNow`) | done, merged (backend PR #42) |
| Part 3 website (entry points, empty-day warning) | done |
| Part 2 website (syllabus line on Home and Analytics) | done |
| Part 1 website (Logs, Mistakes, Sessions) | done, screenshots in `docs/study-ui/screenshots` |
| Suites, PRs, deploy | see the PR |

## Left out because the data does not exist

- **Weekly-goal hours vs hours studied** (Sessions stats): there is no weekly hours goal in the backend (goals carry `totalMinutes` per goal, not a weekly hours target).
- **"Mastered" onboarding status**: onboarding captures only "completed" (no strong/confident/weak), and the syllabus theory model has no Mastered value. Done maps to Completed; nothing else is invented.
- **Mistake reason/type counts**: the notebook has free tags, not a fixed reason field. The rail shows the student's own tags.
- **Merged mistake source filter**: practice mistakes have a separate store, API shape and review flow, so they cannot be merged into this queue cleanly. A visible "My mistakes / From practice" switch replaces the faint link.
- **Focus tab**: it is the full timer experience with its own chrome; only its tab link is in the shared strip.
- Cards show nothing for a figure whose request failed (a dash for the headline, no extras).

## What exists today

### Study screens (website)

- `StudyTabs` (components/study/StudyTabs.tsx): Focus, Sessions, Mistakes, Logs. Headers differ: Sessions says "Study log", Mistakes "Mistakes", Logs "Study".
- `/logs` hub: single column `lg:max-w-3xl`, four `HubCard`s (revision, backlog, practice, mocks). Stats from `listRevisions({from: startOfToday})` (a count of revision LOG entries made today), `getBacklogAnalytics`, `getPracticeAnalytics({period: week})`, `getMockAnalytics({period: all})`.
- `/mistakes`: tabs due / all / stats, `ReviewCard`, coral "Add mistake", faint link to `/home/mistake-notebook` (practice mistakes live in their own notebook). `MistakeStats` has total, active, mastered, dueNow, dueNext7Days, reviewedToday, reviewStreak, bySubject.
- `/sessions`: `lg:max-w-3xl` single column: chart (week/month), log form, history list with filter, edit modal, delete confirm.
- `/timetable`: the editor (`TimetableEditorScreen` + `TimetableBuilder`), reached from onboarding and from the planner.

### Onboarding chapter statuses (backend)

Onboarding records ONE thing per chapter: "completed" (a list of chapter ids). There is no strong/weak/confident capture. `completeOnboarding`:

- writes `user_chapter_progress` rows IN_REVISION, `onboarding = true`, staggered `nextRevisionAt` (planner spaced repetition; not touched by this work).
- writes `chapter_progress` rows `theory_status = 'studied'` but WITHOUT `theory_manual = true`.

The aggregator `lib/phase4/chapterProgress.ts` recomputes non-manual theory status from activity, so the onboarding rows get overwritten with the derived status or deleted as empty rows. That is why chapters marked done at onboarding do not show in Syllabus or Analytics.

The syllabus theory model is `not_started | learning | studied`. There is no separate "Mastered" theory status (strength label strong/medium/weak is a separate, activity-derived field). So the only mapping that applies: done at onboarding -> `studied`, not marked -> unchanged.

### Logs hub "0 revisions today" bug

The hub card counts revision log entries made today. The planner and Quick Access use `getRevisionOverview().todaysRevisionTasks.count` (what is DUE today). Two different sources. The hub must use the overview.

### Timetable

Editor exists (all weekdays, add/remove blocks, import). Backend controller calls `refreshPlanForGoals` after each write. `refreshToday` rebuilds only today; future days that already have a plan keep stale slots. Under PR #41 an empty weekday plans nothing.

## Data each screen can use

| Screen | Real data available |
|---|---|
| Logs summary strip | master analytics: hours this week, sessions, streak; practice analytics: questions solved this week |
| Revision card | revision overview (due today, overdue, done this week, stalest chapters) |
| Backlog card | backlog analytics (items, overdue, next deadline, items by deadline) |
| Practice card | practice analytics (accuracy, questions, daily series, per-chapter accuracy) |
| Mock card | mock analytics (count, last score and percentile, series, chapters repeatedly exposed) |
| Mistakes rail | mistake stats (bySubject, reviewedToday, dueNow, dueNext7Days) and the list (chapterId, tags) for top chapters |
| Sessions stats | study summary (today, week, daily series), weekly goal hours if the analytics payload has them |

Anything not in these payloads is omitted (no placeholder numbers).

## Plan

### Part 2 (backend first)

1. `completeOnboarding`: write `theoryManual: true` with `studied` for each done chapter.
2. Migration with an idempotent backfill from `user_chapter_progress WHERE onboarding = true` into `chapter_progress` (`ON CONFLICT (user_id, chapter_id) DO UPDATE ... WHERE theory_manual = false AND theory_status <> 'studied'`). No sessions or minutes written.
3. Master analytics returns a `syllabus` summary (completed chapters, total, per-subject coverage) from `chapter_progress`.
4. Website: Home and Analytics headers use it ("18 of 90 chapters complete, Physics leads at 32%"), only when data exists.
5. Tests: onboarding payload -> statuses and completion %; twice -> no change; backfill twice -> no change; no study session rows or minutes created.

### Part 3

1. Backend `refreshFromNow`: rebuild today and every future day that already has a current plan, quietly, leaving done tasks and past days alone. Controller calls it after every timetable write.
2. Website: ghost "Edit timetable" in the Planner header, "Study timetable" row in Profile, inline links on the planner warnings. Editor gets copy-day and apply-to-all if missing, plus empty-day warning.
3. Tests: slots change for following days only, past and completed intact, overlap rejected, round trip.

### Part 1

1. Shared: every Study tab header says "Study"; Logs intro copy fixed; restrained motion (`prefers-reduced-motion` respected).
2. Logs: summary strip, 2x2 rich cards, whole card clickable, due-today fix.
3. Mistakes: two columns, sticky rail, source filter.
4. Sessions: chart + stats row, list + sticky form, in-place refresh with toast.
5. Playwright at 1280x800, 1440x900, 1920x1080, 1024, 390, light and dark.
