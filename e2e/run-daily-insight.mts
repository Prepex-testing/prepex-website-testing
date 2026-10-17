// Runs the 22:30 daily-insight job once, now, against the local E2E stack (the cron itself waits for 22:30 IST).
// Usage (from backend/services/core-service): npx tsx <this file> <backend repo dir>
import path from "node:path";
import { pathToFileURL } from "node:url";

const backend = process.argv[2];
if (!backend) throw new Error("usage: run-daily-insight.mts <backend repo dir>");
const svc = await import(pathToFileURL(path.join(backend, "services/core-service/src/modules/insights/daily.service.ts")).href);
const result = await svc.runDailyForAll();
console.log(JSON.stringify(result));
process.exit(0);
