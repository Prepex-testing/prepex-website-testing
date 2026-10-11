// A stand-in for Prepex Brain, for the Phase 5 E2E suite. Never talks to the real Brain.
//
//   node e2e/fake-brain.mjs            → listens on :4999
//   BRAIN_BASE_URL=http://127.0.0.1:4999 BRAIN_API_KEY=e2e-brain-key   ← core-service env
//
// It answers POST /brain/answer the way the real one does (tutor template first, our named sections after), after a delay
// so the UI's "working" state is visible. Control endpoints for the tests:
//   POST /__mode  {"fail": true|false, "delayMs": 2500}   switch to returning 502 / change the delay
//   GET  /__requests                                       every request seen (auth header, mode, payload) as JSON
import http from "node:http";

const PORT = Number(process.env.FAKE_BRAIN_PORT ?? 4999);
const KEY = process.env.FAKE_BRAIN_KEY ?? "e2e-brain-key";
let state = { fail: false, delayMs: 2500 };
const seen = [];

const WEEKLY = `## Short answer
Your week has a pattern worth fixing.

## Explanation
(tutor scaffolding that the product strips)

## JEE traps
1. Do not skip the basics.

## What to try next
Keep going.

## WHAT IS WORKING
You studied on most days and Kinematics got the most time.

## WHAT IS LEAKING
Chemistry got no time at all, and practice accuracy is not being tracked.

## TOP 3 FIXES
1. Kinematics: 90 minutes of problems on Monday.
2. Atomic Structure: 45 minutes on Thursday.
3. A floor of 30 minutes on slow days.
FIXES_JSON: [{"title":"Kinematics: 90 minutes of graph problems","chapter":"Kinematics","minutes":90},{"title":"Atomic Structure: 45 minutes","chapter":"Atomic Structure","minutes":45},{"title":"Keep a 30-minute floor on slow days","chapter":"Kinematics","minutes":30}]`;

const server = http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://x");
    const raw = Buffer.concat(chunks).toString("utf8");
    if (url.pathname === "/__mode" && req.method === "POST") {
      state = { ...state, ...JSON.parse(raw || "{}") };
      return send(200, state);
    }
    if (url.pathname === "/__requests") return send(200, seen);
    if (url.pathname === "/__reset") {
      seen.length = 0;
      state = { fail: false, delayMs: 2500 };
      return send(200, state);
    }
    if (req.method !== "POST" || !url.pathname.startsWith("/brain/")) return send(404, { detail: "not found" });
    if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { detail: "unauthorized" });
    let payload = {};
    try {
      payload = JSON.parse(raw || "{}");
    } catch {
      return send(422, { detail: "bad json" });
    }
    seen.push({ path: url.pathname, mode: url.searchParams.get("mode") ?? "fast", payload, at: Date.now() });
    setTimeout(() => {
      if (state.fail) return send(502, { detail: "upstream unavailable" });
      send(200, { answer: WEEKLY, citations: [], confidence: 0.8, model_used: "fake-brain", mode: url.searchParams.get("mode") ?? "fast", tokens_used: 1234, prompt_version: "e2e-1" });
    }, state.delayMs);
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`fake brain on :${PORT}`));
