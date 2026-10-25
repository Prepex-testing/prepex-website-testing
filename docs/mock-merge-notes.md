# Mock log merge: old mock analysis into the new mock log

Two mock screens existed. They were separate products on separate tables:

| | Old | New |
|---|---|---|
| Screens | `/home/mock-analysis`, `/upload-scorecard`, `/view-analytics` | `/logs/mocks` (Log Mock, All Mocks, Analytics, Share) |
| Table | `mock_analysis` (+ `mock_subject_analysis`, `mock_topic_analysis`) | `mock_tests` |
| API | `/api/mock` | `/api/mocks` |
| Entered by | manual (basic, medium), scorecard photo, quick log | manual form |

The new mock log is the base. Everything below is the decision for each feature that only the old one had.

| Feature | Exists in | Decision | Reason |
|---|---|---|---|
| Fill the form from a scorecard photo (Claude vision) | old only | **Ported.** "Fill from a scorecard photo" on the Log Mock tab reads the image and fills the new form for the student to check. | The one capability a student cannot get any other way. It reuses the existing `/api/mock/extract-image` endpoint, so no backend change. |
| Exam type, date, marks, total, time taken | both | Already in new. | |
| Per-subject marks | both | Already in new (Physics, Chemistry, Maths, Biology). | |
| Source institute | old only | Ported as a line in the mock's notes ("Source: Allen"). | A free-text note is enough; no column. |
| Chapters flagged weak | old (topic analysis) | Ported through the backfill into `weak_chapter_ids`; new form already has a weak-chapter picker. | New analytics and the "plan weak chapters" action already read it. |
| Per-chapter question counts (attempted, correct, wrong) | old only | **Discarded.** | The new log records weak chapters, not per-chapter counts, and nothing else in the product reads the counts. Not worth a new table. The old rows stay in `mock_analysis` for one release. |
| Insights page (trend, deltas, guidance) | old only | **Discarded.** | New Analytics already has score progression, subject averages, weak chapters and projected rank, built from the same marks. |
| Quick log tier | old only | Discarded. | The new form already needs only total, max and date. |
| Share card | both | Kept the new one. | |
| Planner mock tasks linking to the scorecard form | old | **Re-pointed** to `/logs/mocks` (`?mockName=&date=` fills the form; `?tab=all` after a mock is scored). | The old pages are deleted. |
| Scheduled mock shown on the plan day screen | old | Link now goes to `/logs/mocks`. | |

## Data

`20261026000000_logs_redesign` copies every `mock_analysis` row into `mock_tests` once:

- `source = 'LEGACY_MIGRATION'`, `legacy_analysis_id` = the old id (unique, so a second run copies nothing).
- Exam pattern from `exam_type` (Advanced, NEET, otherwise JEE Main); test type `full_mock`.
- Per-subject marks from `mock_subject_analysis` (subject ids 1 to 4), weak chapters from `mock_topic_analysis`.
- Rows that would break the log's own checks (marks above the maximum, non-positive maximum) are not copied and stay in the old table.
- The migration prints how many were copied.

The old tables and the `/api/mock` module stay in place, marked `@deprecated` in the Prisma schema, for one release.
