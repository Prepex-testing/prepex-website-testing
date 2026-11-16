// Runs the 22:30 daily-insight job once, now, against the local E2E stack (the cron itself waits for 22:30 IST).
// Usage (from backend/services/core-service): npx tsx <this file> <backend repo dir> [student id]
import path from "node:path";
import { pathToFileURL } from "node:url";

const backend = process.argv[2];
if (!backend) throw new Error("usage: run-daily-insight.mts <backend repo dir>");
const svc = await import(pathToFileURL(path.join(backend, "services/core-service/src/modules/insights/daily.service.ts")).href);
// With a student id, run the job for that student only (the shared E2E database holds other students' activity too).
const only = process.argv[3];
const result = only
  ? await svc.generateForStudent(only).then((r: "ready" | "failed" | "skipped") => ({ students: 1, ready: r === "ready" ? 1 : 0, failed: r === "failed" ? 1 : 0, skipped: r === "skipped" ? 1 : 0 }))
  : await svc.runDailyForAll();
console.log(JSON.stringify(result));
process.exit(0);
