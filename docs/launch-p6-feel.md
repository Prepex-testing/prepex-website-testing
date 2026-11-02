# Launch P6: instant, alive, premium (app-wide)

Rollback: both repos are tagged `pre-p6-ui` (website `06007b6`, backend `7a2b9c0`). Redeploy that tag to get the pre-P6
look back. Every P6 change is in shared files, so reverting one PR undoes one part.

## Approach and decisions

- **System level, not per screen.** Changes go into the request layer, the shared UI components (`components/ui/*`,
  `components/planner/Sheet`, `components/layout/*`), the app shell and global CSS tokens, so every route gets them at once.
- **No colour changes.** Only new tokens were added (`--dur-*`, `--ease-*`, `--shadow-sm/md/lg`, `--radius-*`), derived
  from existing colours. Existing colour values are untouched (check: `git diff pre-p6-ui -- app/globals.css` shows
  additions only, apart from comments).
- **Data layer: the existing request layer, not TanStack Query.** Moving ~80 screens to a query library is a rewrite with
  a high risk of regressions days before launch. The request layer already dedupes reads and remembers answers for 15 s;
  P6 adds stale-while-revalidate (an answer under 2 minutes old is returned at once and refreshed in the background),
  keeps the running timer, gates and bell always fresh, and lets the minute heartbeat forget only time/XP answers.
  **Not done:** persisting the cache across a full reload. Without subscriptions, a persisted copy would stay on screen
  without refreshing; that needs the query-library migration (recommended after launch).
- **Optimistic UI:** the focus timer (QA pass), task ticks and notebook autosave already update at once. A full sweep of
  every mutation was not done in P6 (each needs its own rollback path); listed below.

## Part A: instant

| Item | Status | Where |
|---|---|---|
| A1 audit: full-page loaders | 54 screens used `PageLoader` (a spinning-dot circle); 7 files used spinners | `PageLoader`, `LoadingIndicator` |
| A2 stale-while-revalidate | done (request layer) | `lib/api/authRequest.ts` |
| A3 prefetch | routes: Next.js `Link` prefetch (production default). Data: main nav items warm their screen's data on hover, focus and touch | `lib/prefetch/navData.ts`, `Sidebar`, `BottomNav` |
| A4 optimistic UI | partial (timer, task tick, autosave were already optimistic) | — |
| A5 no spinners | done: `PageLoader` shows nothing for 300 ms, then a content-shaped skeleton; `LoadingIndicator` is a breathing logo | `components/ui/PageLoader.tsx`, `LoadingIndicator.tsx` |
| A6 boot splash | done: steps rise, coral dot drops (spring); once per browser session; min 700 ms; breathes after 1.5 s; inline, paints before JS | `components/boot/*`, `app/layout.tsx`, `AuthGate` |
| A6 lite / reduced motion | done: `html[data-motion]` set before first paint (`full`, `lite` on ≤4 GB or ≤4 cores or by setting, `reduce` from the OS) | `components/theme/constants.ts`, `globals.css` |
| A7 code splitting | existing (Next route splitting; charts and editor already `dynamic`) | — |
| A8 budgets | measured on testing, see the PR | — |

## Part B: alive

| Item | Status | Where |
|---|---|---|
| B1 motion tokens | done: CSS `--dur-micro/standard/emphasis`, `--ease-out/in/spring`; JS `lib/motion/tokens.ts`; guarded by a test on the shared motion files | `globals.css`, `lib/motion/tokens.ts` |
| B2 buttons | done app-wide: every button presses in (scale 0.97, zero-specificity rule so component classes still win); shared `Button`, `CoralButton` (plus coral glow), `GhostButton` lift 1px on hover | `globals.css`, `components/ui/*Button.tsx` |
| B2 cards | `.lift` utility (hover lift + shadow, press 0.98) applied to notebook covers and Home tiles; not yet applied to every card on every screen | `globals.css` |
| B2 links / inputs | not changed (an app-wide underline or focus animation risks restyling content) | — |
| B3 sidebar | active highlight glides between items (Motion `layoutId`); labels nudge on hover; collapse is 350 ms with ease-out (was 700 ms). Still animates width (a transform rewrite of the sidebar was judged too risky) | `Sidebar`, `AppShell` |
| B3 tab bars | indicator glides on: Study tabs, section tabs (Revision/Backlog/Practice), Logs/Analytics scaffold tabs, notebook sections, leaderboard boards | `components/motion/GlidePill.tsx` |
| B3 bottom nav | active icon pops, highlight glides | `BottomNav` |
| B4 page enter | every route's content fades in with an 8 px rise, without remounting (class re-applied per path) | `AppShell` |
| B4 list stagger | `.stagger` (30 ms per item, first 8; lite: first 3): leaderboard rows, notebook shelf | `globals.css` |
| B5 overlays | `Modal`, `Sheet` slide up with a spring; `WhiteModal`/`ConfirmModal` pop; backdrops fade; Esc and focus handling were already there | shared overlays |
| B5 toasts | slide in with a spring | `Toast` |
| B5 numbers / ticks | existing: `CountUp`, `TickFeedback` (task tick + XP pop) | — |
| B5 empty states | not changed | — |
| B6 scrolling | native scrolling kept; no hijacking. Compressing headers and pull-to-refresh not done | — |
| B7 command palette | done: Ctrl/Cmd+K or `/`; screens + actions (focus, quick log, theme); fuzzy; keyboard; blur backdrop (lite: dim). Keys: F focus, N notebooks, L quick log | `components/command/CommandPalette.tsx` |
| B8 sound | not done (optional, off by default in the spec) | — |
| B9 tests | palette, shortcuts, fuzzy, token guard, splash, skeleton, prefetch, SWR | `components/command/p6Alive.test.tsx`, `components/boot/p6Instant.test.tsx` |

## Part C: surfaces and theme

| Item | Status | Where |
|---|---|---|
| C1 light default | done: a new device paints light (even with a dark OS); a choice is remembered on the device; "System" follows the OS only when picked. Remembering the theme on the account (server side) is not done | `components/theme/constants.ts`, `ThemeProvider` |
| C1 Settings → Appearance | done: Theme (Light / Dark / System), Motion (Auto / Full / Lite). Sound toggle not added (no sounds exist) | `components/settings/AppearanceSettings.tsx` |
| C2 colour tokens | unchanged: `git diff pre-p6-ui -- app/globals.css` removes 0 lines, adds only new tokens and classes | `globals.css` |
| C2 shadow / radius tokens | added (`--shadow-sm/md/lg` tuned per theme, `--radius-card/button/sheet`); used by the redesigned Home, leaderboard, weekly review, palette | `globals.css` |
| C2 fewer borders on every card | not done app-wide: there is no shared card component, so it means editing every screen; the redesigned screens use softer borders plus shadow | — |
| C2 typography / icons | tabular numbers on the redesigned stats; one icon set (lucide + the existing icon file) unchanged | — |
| C3/C4 route walk | every app route loaded at 390 and 1440 px in light and dark on testing, checking for page errors and sideways overflow (see the PR) | — |

## Not done in P6 (for a later pass)

Sound; animated empty states; compressing large headers and pull-to-refresh; a transform-based sidebar; persisting the
data cache across reloads (needs a query library); an optimistic-UI sweep of every mutation; card hover on every screen;
theme saved to the account; recorded GIFs of each interaction.
