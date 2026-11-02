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
